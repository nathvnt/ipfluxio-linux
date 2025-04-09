import { app, BrowserWindow, ipcMain, dialog } from "electron";

app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('force_low_power_gpu');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('noerrdialogs');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512 --initial-old-space-size=256');
app.commandLine.appendSwitch('disable-features', [
    'SpareRendererForSitePerProcess',
    'Translate',
    'SpeechSynthesis',
    'HardwareMediaKeyHandling',
    'AutoplayIgnoreWebAudio',
  ].join(','));
  

import { spawn, exec, spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import { networkInterfaces } from "os";
import { initMapHandlers, updateMap } from "./map-handler.js";
import { initDictionaryHandlers } from "./grab-dictionary.js";


//--file paths--
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
const BASE_PATH = "/opt/ipfluxio/backend"; 
const LOG_BASE = "/var/log/ipfluxio";
//scripts
const DISPATCHER_SCRIPT = path.join(BASE_PATH, "scans", "dispatcher.py");
const MAPS_SCRIPT = path.join(BASE_PATH, "maps", "generate_map.py");
const SECURITY_SCAN_SCRIPT = path.join(BASE_PATH, "scans", "security_scan.py");
const FLAGGER_SCRIPT = path.join(BASE_PATH, "scans", "packet_utils", "flagger.py");
//json data
const ENDPOINT_DICTIONARY_PATH = path.join(LOG_BASE, "logs", "archive", "endpoint_dictionary.json");
const FLAGGED_FILE_PATH = path.join(LOG_BASE, "logs", "archive", "flagged_dictionary.json");
const TRUSTED_FILE_PATH = path.join(LOG_BASE, "logs", "archive", "trusted_dictionary.json");
const SCAN_TRACKING_PATH = path.join(LOG_BASE, "logs", "schedule", "scan_pid_tracking.json");
const SCAN_SCHEDULE_PATH = "/var/lib/ipfluxio/scheduled_jobs.json";
//env
const RESOURCES_PATH = "/opt/ipfluxio"; 
const DEFAULT_ENV = path.join(RESOURCES_PATH, "default-env", ".env");
//python environment
const VENV_PATH = "/opt/ipfluxio/venv";
const SYSTEM_PYTHON = path.join(VENV_PATH, "bin", "python");

export const paths = {
    BASE_PATH,
    DISPATCHER_SCRIPT,
    MAPS_SCRIPT,
    ENDPOINT_DICTIONARY_PATH,
    SECURITY_SCAN_SCRIPT,
    FLAGGER_SCRIPT,
    FLAGGED_FILE_PATH,
    TRUSTED_FILE_PATH,
    SCAN_TRACKING_PATH,
    SCAN_SCHEDULE_PATH,
    RESOURCES_PATH,
    DEFAULT_ENV,
    VENV_PATH,
    SYSTEM_PYTHON,
    POSTINSTALL_SCRIPT: path.join(process.resourcesPath, "postinstall.sh"),
};

//variables
let win;
export let currentMode = "active"; 

//scan process tracking stuff
let activeScanProcess = null;
let activeScanPid = null;
let passiveScanProcess = null;
let passiveScanPid = null;
let backgroundScanEnabled = false;
let eventLog = [];

//mode dependent variables
export const appState = {
    active: {
        currentLogFile: null,
        highlightedMarkers: new Set(),
        currentMapType: null,
    },
    passive: {
        currentLogFile: null,
        highlightedMarkers: new Set(),
        currentMapType: null,
    }
};


//start app
app.whenReady().then(() => {
    //ensure python env is setup
    if (!fs.existsSync(SYSTEM_PYTHON)) {
        //instead run post install script 
        const result = spawnSync("sudo", ["bash", paths.POSTINSTALL_SCRIPT], {
            stdio: "inherit"
        });

        if (result.status !== 0) {
            dialog.showErrorBox(
                "Post-install Failed",
                "Failed to set up required Python environment. Please run the postinstall.sh script manually with sudo."
            );
            app.quit();
            return;
        }
        console.log("Post-install completed, run app using command 'ipfluxio'");
        app.exit(0);
        return;
    }

    //launch ui 
    win = new BrowserWindow({
        width: 1600,
        height: 800,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            enableRemoteModule: false, 
            nodeIntegration: false,
            sandbox: false,
        }
    });
    win.setMenuBarVisibility(false);

    win.loadFile(path.join(__dirname, "..", "frontend", "index.html"));

    initMapHandlers(ipcMain, win);
    initDictionaryHandlers(ipcMain);
    
    //console.log("Initializing empty map...");
    addEventLog(`[TRAFFIC MAP GENERATED]`);
    updateMap("reset");

    win.webContents.once("did-finish-load", () => {
        //ensure python venv has permissions to capture network traffic 
        checkPacketCapPermissions(SYSTEM_PYTHON).catch((err) => {
            console.error("Permission check failed:", err.message);
        });
    });
});


//-----HANDLE--SWITCHING--MODES
//-----------------------------------------------------------------------------------------//
//handler to get current mode
ipcMain.handle("get-current-mode", () => {
    return currentMode;
});

//handler to update the current mode
ipcMain.on("set-current-mode", (_, mode) => {
    if (currentMode !== mode) {

        //reset highlighted markers on map & table
        appState[currentMode].highlightedMarkers.clear(); 
        const highlightedArray = Array.from(appState[currentMode].highlightedMarkers);
        win.webContents.send("highlighted-coordinates", highlightedArray);

        //reset map
        updateMap("reset"); 

        //switch mode
        //console.log(`Switching to mode: ${mode}`);
        addEventLog(`[SWITCHED TO ${mode} MODE]`);
        currentMode = mode;
    }
});


//-----HANDLE--API--KEYS--&--DATA--HASHING
//-----------------------------------------------------------------------------------------//
export function loadApiKeys() {
    let defaultKeys = {};
  
    if (fs.existsSync(DEFAULT_ENV)) {
      defaultKeys = dotenv.parse(fs.readFileSync(DEFAULT_ENV));
    }
  
    const VIRUSTOTAL_KEY = defaultKeys.VIRUSTOTAL_KEY;
    const ABUSEIPDB_KEY = defaultKeys.ABUSEIPDB_KEY;
    return { VIRUSTOTAL_KEY, ABUSEIPDB_KEY };
}

function hashFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const contents = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(contents).digest("hex");
}
  

//-----HANDLE--PYTHON--PERMISSIONS
//-----------------------------------------------------------------------------------------//

async function checkPacketCapPermissions(pythonPath){
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(paths.BASE_PATH, "check_caps.py");

        const testProcess = spawn(pythonPath, [scriptPath]);
    
        let output = "";
    
        testProcess.stdout.on("data", (data) => {
            output += data.toString();
        });
        
        testProcess.on("exit", async (code) => {
            if (output.includes("OK")) {
                resolve(true); //permission already granted
            } else {
                const { response } = await dialog.showMessageBox(win, {
                    type: "warning",
                    buttons: ["Grant Permissions", "Cancel"],
                    defaultId: 0,
                    cancelId: 1,
                    title: "Network Permission Required",
                    message: `ipfluxio needs permission to capture packets.`,
                    detail: `This process uses an isolated virutal Python environment that needs setcap permissions in order to capture packets from your network traffic. \n\nWould you like to grant these permissions now?`
                })

                if (response === 0) {
                    const pkexecProcess = spawn("pkexec", ["/usr/local/bin/grant-capture.sh", pythonPath], {
                        detached: true,
                        stdio: "ignore"
                    });

                    pkexecProcess.unref();
                    resolve(false); // assume success after manual approval
                } else {
                    app.quit();
                    reject(new Error("Permission not granted"));
                }
            }
        });
    
        testProcess.on("error", (err) => {
          reject(err);
        });
    });
}


//-----HANDLE--EVENT--LOG
//-----------------------------------------------------------------------------------------//
//receive log events from renderer
ipcMain.on('log-event', (event, message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;

    eventLog.push(logEntry); //add new entry 

    if (eventLog.length > 100) eventLog.shift(); //limit log size

    event.sender.send('update-event-log', eventLog); //update component 
});

//receive log events from inside main.js
function addEventLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;

    eventLog.push(logEntry);
    if (eventLog.length > 100) eventLog.shift(); 

    if (win && win.webContents) {
        win.webContents.send('update-event-log', eventLog);
    }
}


//---SCAN--MGMT-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------//
ipcMain.handle("get-network-interfaces", async () => {
    try {
        const nets = networkInterfaces();
        const results = [];

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === "IPv4" && !net.internal) {
                    results.push(name);
                }
            }
        }

        //console.log("Returning network interfaces:", results);
        addEventLog(`[NETWORK INTERFACES RETURNED: ${results}]`);
        return results;
    } catch (error) {
        console.error("Error retrieving network interfaces:", error);
        return [];
    }
});


//-------------------- ACTIVE SCAN START-----------------------
ipcMain.on("start-active-scan", (_, config) => {
    console.log("Starting ACTIVE scan:", config);

    if (activeScanProcess) activeScanProcess.kill();

    const configWithPython = {
        ...config,
        pythonBinary: paths.SYSTEM_PYTHON
    };

    const pythonProcess = spawn(paths.SYSTEM_PYTHON, [DISPATCHER_SCRIPT, JSON.stringify(configWithPython)]);

    activeScanProcess = pythonProcess;
    activeScanPid = null;

    pythonProcess.stdout.on("data", async (data) => {
        const output = data.toString().trim();
        console.log(`[ACTIVE SCAN OUTPUT]: ${output}`);

        //intercept pid from process output
        const pidMatch = output.match(/^\[ACTIVE\] Starting scan process:\s*(\d+)/i);
        if (pidMatch && pidMatch[1]) {
            activeScanPid = parseInt(pidMatch[1], 10);
            console.log(`Tracking ACTIVE scan PID: ${activeScanPid}`);

            addEventLog(`[ACTIVE SCAN (PID: ${activeScanPid}) STARTED]`);
        }

        //intercept log file path from process output
        const logMatch = output.match(/^\[ACTIVE\] Log file created:\s*(.*)/i);
        if (logMatch) {
            const logFilePath = path.resolve(logMatch[1].trim());
            appState["active"].currentLogFile = logFilePath;
            appState["active"].highlightedMarkers.clear();
            win.webContents.send("active-log-file", logFilePath);
        }

        //intercept scan pid tracking file update
        const trackingMatch = output.match(/\[ACTIVE\] Scan Tracking JSON:\s*(\{.*\})/);
        if (trackingMatch && trackingMatch[1]) {
            try {
                //send data to update marquee renderer
                const scanData = JSON.parse(trackingMatch[1]);   
                win.webContents.send("scan-marquee-update", {
                    scanType: scanData.scanType,
                    pid: scanData.scanPid,
                    logPath: scanData.logPath,
                    startTime: scanData.startTime
                });
            } catch (err) {
                console.error("Failed to parse scan tracking JSON from dispatcher output:", err);
            }
        }

        const bookKeeperUpdate = output.match(/book\s+keeper\s+updating\s+dictionary/i);
        if (bookKeeperUpdate) {
            addEventLog(`[BOOK KEEPER UPDATING ENDPOINT DICTIONARY]`);
        }

        //intercept scan complete message from process output
        const scanComplete = output.match(/^\[ACTIVE\] Scan Complete/i);
        if (scanComplete) {
            console.log(`[ACTIVE] Scan process (PID: ${activeScanPid}) reported COMPLETE.`);

            //double-check process is dead at OS level
            if (activeScanPid) {
                setTimeout(() => {
                    exec(`ps -p ${activeScanPid}`, (err, stdout) => {
                        if (err || !stdout.includes(activeScanPid.toString())) {
                            console.log(`[ACTIVE] Process PID ${activeScanPid} has exited.`);
                            addEventLog(`[ACTIVE SCAN (PID: ${activeScanPid}) ENDED]`);

                            updateScanTracking(activeScanPid, "active");
                            updateMap("update");
                            activeScanProcess = null;
                            activeScanPid = null;
                        } else {
                            console.warn(`[ACTIVE] Process PID ${activeScanPid} still alive!`);
                            //force kill
                            exec(`kill ${activeScanPid}`);
                        }
                    });
                }, 4000);
            }
        }
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`[ACTIVE SCAN ERROR]: ${data.toString()}`);
    });
});


//-------------------- PASSIVE SCAN START-----------------------
ipcMain.on("start-passive-scan", (_, config) => {
    console.log("Starting PASSIVE scan:", config);
    
    if (passiveScanProcess) passiveScanProcess.kill();

    backgroundScanEnabled = config.backgroundScan || false;
    let insideTimingWindow = config.insideTimingWindow; 

    const configWithPython = {
        ...config,
        pythonBinary: paths.SYSTEM_PYTHON
    };

    const pythonProcess = spawn(paths.SYSTEM_PYTHON, [DISPATCHER_SCRIPT, JSON.stringify(configWithPython)]);

    //const pythonProcess = spawn(paths.SYSTEM_PYTHON, [DISPATCHER_SCRIPT, JSON.stringify(config)]);
    passiveScanProcess = pythonProcess;
    passiveScanPid = null;

    pythonProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();
        console.log(`[PASSIVE SCAN OUTPUT]: ${output}`);

        //intercept pid from process output
        const pidMatch = output.match(/^\[PASSIVE\] Starting scan process:\s*(\d+)/i);
        if (pidMatch && pidMatch[1]) {
            passiveScanPid = parseInt(pidMatch[1], 10);
            console.log(`Tracking PASSIVE scan PID: ${passiveScanPid}`);

            addEventLog(`[PASSIVE SCAN (PID: ${passiveScanPid}) STARTED]`);
        }

        //intercept log file path from process output
        const logMatch = output.match(/^\[PASSIVE\] Log file created:\s*(.*)/i);
        if (logMatch) {
            const logFilePath = path.resolve(logMatch[1].trim());
            appState["passive"].currentLogFile = logFilePath;
            appState["passive"].highlightedMarkers.clear();
            win.webContents.send("passive-log-file", logFilePath);
        }
        
        //intercept scan pid tracking file update
        const trackingMatch = output.match(/\[PASSIVE\] Scan Tracking JSON:\s*(\{.*\})/);
        if (trackingMatch && trackingMatch[1]) {
            try {
                //send data to update marquee renderer
                const scanData = JSON.parse(trackingMatch[1]);
                win.webContents.send("scan-marquee-update", {
                    scanType: scanData.scanType,
                    pid: scanData.scanPid,
                    logPath: scanData.logPath,
                    startTime: scanData.startTime
                });
            } catch (err) {
                console.error("Failed to parse scan tracking JSON from dispatcher output:", err);
            }
        }

        const bookKeeperUpdate = output.match(/book\s+keeper\s+updating\s+dictionary/i);
        if (bookKeeperUpdate) {
            addEventLog(`[BOOK KEEPER UPDATING ENDPOINT DICTIONARY]`);
        }

        
        //intercept scan complete message from process output
        const scanComplete = output.match(/^\[PASSIVE\] Scan Complete/i);
        if (scanComplete || !insideTimingWindow) {
            console.log(`[PASSIVE] Scan process (PID: ${passiveScanPid}) reported COMPLETE.`);

            //double-check process is dead at OS level
            if (passiveScanPid) {
                setTimeout(() => {
                    exec(`ps -p ${passiveScanPid}`, (err, stdout) => {
                        if (err || !stdout.includes(passiveScanPid.toString())) {
                            console.log(`[PASSIVE] Process PID ${passiveScanPid} has exited.`);
                            addEventLog(`[PASSIVE SCAN (PID: ${passiveScanPid}) ENDED]`);

                            updateScanTracking(passiveScanPid, "passive");
                            updateMap("update");
                            passiveScanProcess = null;
                            passiveScanPid = null;
                        } else {
                            console.warn(`[PASSIVE] Process PID ${passiveScanPid} still alive!`);
                            //force kill
                            exec(`kill ${passiveScanPid}`);
                        }
                    });
                }, 4000);
            }
        }
        
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`[PASSIVE SCAN ERROR]: ${data.toString()}`);
    });
});



//--------stop scan buttons click event-----------------------------------
ipcMain.on("stop-scan", (_, mode) => {
    console.log(`Stop Scan Request Received for ${mode} mode...`);

    let scanPid = mode === "active" ? activeScanPid : passiveScanPid;
    
    if (!scanPid) {
        console.log(`No ${mode} scan process is currently running.`);
        return;
    }

    console.log(`Stopping ${mode} scan process (PID: ${scanPid})...`);
    addEventLog(`[STOP REQUESTED FOR SCAN (PID: ${scanPid})]`);

    try {
        process.kill(scanPid, "SIGINT");
        updateScanTracking(scanPid, mode);
    } catch (err) {
        console.error(`Error stopping ${mode} scan:`, err);

        //path to scan pid tracking file: SCAN_TRACKING_PATH
        //fallback set running status for scanPid in SCAN_TRACKING_PATH to false
        if(mode === "passive"){
            try {
                const data = JSON.parse(fs.readFileSync(SCAN_TRACKING_PATH, "utf-8"));
                if (data[scanPid]) {
                    data[scanPid].running = false;
                    fs.writeFileSync(SCAN_TRACKING_PATH, JSON.stringify(data, null, 2));
                    console.log(`Set scan PID ${scanPid} 'running' to false in tracking file.`);
                    setTimeout(() => {
                        updateScanTracking(scanPid, mode);
                    }, 3000);
                }
            } catch (e) {
                console.error("Failed to update scan_pid_tracking.json for fallback stop:", e);
            }
        }
    }

    updateMap("update");

    if (mode === "active") {
        activeScanProcess = null;
        activeScanPid = null;
    } else if (mode === "passive") {
        passiveScanProcess = null;
        passiveScanPid = null;
    }
});


//----manage scan processes when application is closed-----
app.on("before-quit", () => {
    console.log("Application is closing...");
    if (passiveScanPid && !backgroundScanEnabled) {
        console.log(`Stopping passive scan (PID: ${passiveScanPid}) before exiting.`);
        try {
            process.kill(passiveScanPid, "SIGINT");
            updateScanTracking(passiveScanPid, "passive");
        } catch (err) {
            console.error(`Error stopping passive scan:`, err);
        }
    }
    if (activeScanPid) {
        console.log(`Stopping active scan (PID: ${activeScanPid}) before exiting.`);
        try {
            process.kill(activeScanPid, "SIGINT");
            updateScanTracking(activeScanPid, "active");
        } catch (err) {
            console.error(`Error stopping passive scan:`, err);
        }
    }
});

//update scan pid tracking file when scans end
function updateScanTracking(removePid, scanType) {
    if (!fs.existsSync(SCAN_TRACKING_PATH)) return;

    let trackingData = JSON.parse(fs.readFileSync(SCAN_TRACKING_PATH, "utf8"));

    if (trackingData[removePid]) {
        delete trackingData[removePid];

        fs.writeFileSync(SCAN_TRACKING_PATH, JSON.stringify(trackingData, null, 4));

        win.webContents.send("scan-marquee-reset", scanType);
    }
}

//check scan pid tracking file for live scans when app loads
//(for attaching traffic table to passive mode background scan)
ipcMain.handle("attach-live-scan", async (event) => {
    try {
        if (!fs.existsSync(SCAN_TRACKING_PATH)) {
            console.log("No scan_pid_tracking.json found.");
            return { success: false };
        }

        const data = JSON.parse(fs.readFileSync(SCAN_TRACKING_PATH, 'utf-8'));

        //find passive scan
        for (const pid in data) {
            const scan = data[pid];
            if (scan.scanType === "passive") {
                console.log(`Found background passive scan (PID: ${scan.scanPid})`);
                passiveScanPid = scan.scanPid;
                backgroundScanEnabled = true;

                const logFile = path.resolve(scan.logPath);
                appState[currentMode].currentLogFile = logFile;

                console.log(`Reattaching passive scan log to gui: ${logFile}`);
                win.webContents.send("passive-log-file", logFile);

                win.webContents.send("scan-marquee-update", {
                    scanType: scan.scanType,
                    pid: scan.scanPid,
                    logPath: scan.logPath,
                    startTime: scan.startTime
                });
                
                return { success: true, pid: scan.scanPid, logPath: logFile };
            }
        }

        //console.log("No live passive scan found.");
        return { success: false };

    } catch (err) {
        console.error(`Error checking live scan:`, err);
        return { success: false, error: err.message };
    }
});

//check scan pid tracking file for live scans before attaching live graph
ipcMain.handle("check-live-scan", async (event, selectedLogFile) => {
    try {
        if (!fs.existsSync(SCAN_TRACKING_PATH)) {
            return { success: false };
        }

        const data = JSON.parse(fs.readFileSync(SCAN_TRACKING_PATH, 'utf-8'));

        for (const pid in data) {
            const scan = data[pid];
            //match by log filename or full path
            if (scan.logFile === selectedLogFile || path.basename(scan.logPath) === selectedLogFile) {
                return { success: true, scanType: scan.scanType, pid: scan.scanPid };
            }
        }

        return { success: false };
    } catch (err) {
        console.error("Error checking live log:", err);
        return { success: false, error: err.message };
    }
});

