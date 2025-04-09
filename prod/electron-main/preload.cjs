const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

contextBridge.exposeInMainWorld("electronAPI", {
    sendConsoleLog: (message) => ipcRenderer.send("console-log", message),

    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },

    receive: (channel, callback) => {
        ipcRenderer.on(channel, (_, data) => callback(data));
    },
    
    invoke: (channel, ...args) => {
        return ipcRenderer.invoke(channel, ...args); 
    },

    getCurrentMode: async () => {
        return await ipcRenderer.invoke("get-current-mode");
    },

    setCurrentMode: (mode) => {
        ipcRenderer.send("set-current-mode", mode);
    },
    
    attachLiveScan: () => ipcRenderer.invoke("attach-live-scan"),

    checkLiveScan: (selectedLogFile) => ipcRenderer.invoke("check-live-scan", selectedLogFile),


    readLogFile: (filePath, callback) => {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("Error reading log file:", err);
                callback(null);
            } else {
                callback(data);
            }
        });
    },

    watchLogFile: (filePath, callback) => {
        if (typeof callback !== "function") {
            console.error("watchLogFile requires a valid callback function.");
            return;
        }

        fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
            callback(curr, prev);
        });
    },

    fetchLogFiles: (mode) => {
        return new Promise((resolve, reject) => {
            //const logsDir = path.join(__dirname, "..", "backend", "logs", mode === "active" ? "active" : "baseline");
            const logsDir = path.join("/var/log/ipfluxio", "logs", mode === "active" ? "active" : "baseline");

            fs.readdir(logsDir, (err, files) => {
                if (err) {
                    console.error(`Error reading log directory (${logsDir}):`, err);
                    reject(err);
                } else {
                    //filter log files based on naming pattern
                    const logFiles = files.filter(file => 
                        mode === "active" ? file.startsWith("network_traffic_") : file.startsWith("baseline_")
                    );
                    resolve(logFiles);
                }
            });
        });
    },
    
    getEndpointData: () => ipcRenderer.invoke("get-endpoint-data"),
    fetchSecurityData: (ip) => ipcRenderer.invoke("fetch-security-data", ip),

    getFlaggedData: () => ipcRenderer.invoke("get-flagged-data"),
    getTrustedData: () => ipcRenderer.invoke("get-trusted-data"),
    updateFlaggedTrusted: (data) => ipcRenderer.invoke("update-flagged-trusted", data),

    getScanSchedule: () => ipcRenderer.invoke("get-scan-schedule"),

    logEvent: (message) => ipcRenderer.send('log-event', message),
    onUpdateEventLog: (callback) => ipcRenderer.on('update-event-log', callback),

    sendHighlightMarker: (lat, lng) => {
        ipcRenderer.send("highlight-marker", { lat, lng });
    },

    receiveHighlightRows: (callback) => {
        ipcRenderer.on("highlight-rows", (event, { lat, lng }) => {
            callback(lat, lng);
        });
    }
});

window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "mapClick") {
        let lat = event.data.location[0];
        let lng = event.data.location[1];
        let formattedMessage = `[MAP-CLICK] LOCATION: [${lat}, ${lng}]`;

        ipcRenderer.send("console-log", formattedMessage);
    }
});

