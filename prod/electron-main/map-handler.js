import { spawn } from "child_process";
import path from "path";
import { currentMode, paths, appState } from "./main.js";

let winRef = null;

export async function initMapHandlers(ipcMain, win) {
    winRef = win;

    //update map when user loads in log file or new log file is created from new scan
    ipcMain.on("generate-map", (event, logFile) => {
        appState[currentMode].currentLogFile = logFile;
        appState[currentMode].highlightedMarkers.clear();
        updateMap("update");
    });

    //refresh map button click
    ipcMain.on("refresh-manual", (_, selectedMapType) => {
        if (selectedMapType) {
            appState[currentMode].currentMapType = selectedMapType;
        }
        updateMap("update");
    });    

    //lat long cell click in traffic table 
    ipcMain.on("highlight-marker", (_, { lat, lng }) => {
        updateMapWithNewColor(lat, lng); 
    });

    //marker clicked on map 
    ipcMain.on("console-log", (_, message) => {
        if (message.startsWith("[MAP-CLICK] LOCATION: ")) {
            let match = message.match(/\[MAP-CLICK\] LOCATION: \[(.*?),(.*?)\]/);
            if (match) {
                let lat = parseFloat(match[1].trim());
                let lng = parseFloat(match[2].trim());
                updateMapWithNewColor(lat, lng);
            }
        }
    });

};

export async function updateMap(action, logFile = appState[currentMode].currentLogFile, mapType = appState[currentMode].currentMapType) {
    if (!logFile && action !== "reset") {
        console.error("No log file available for map update.");
        return;
    }

    if (!mapType) {
        mapType = "bubble";
    }

    const highlightedArray = JSON.stringify([...appState[currentMode].highlightedMarkers]);

    const pythonCmd = spawn(paths.SYSTEM_PYTHON, [paths.MAPS_SCRIPT, action, logFile, highlightedArray, mapType], {
        cwd: path.join(paths.BASE_PATH, "maps"),
    });

    pythonCmd.stdout.on("data", (data) => console.log(`Python Output: ${data.toString().trim()}`));
    pythonCmd.stderr.on("data", (data) => console.error(`Python Error: ${data.toString().trim()}`));

    pythonCmd.on("exit", () => {
        winRef.webContents.send("refresh-map");
    });
}

// highlight map marker 
export async function updateMapWithNewColor(lat, lng) {

    const coordinateKey = `${lat},${lng}`;
    
    if (appState[currentMode].highlightedMarkers.has(coordinateKey)) {
        appState[currentMode].highlightedMarkers.delete(coordinateKey); 
    } else {
        appState[currentMode].highlightedMarkers.add(coordinateKey); //toggle green
    }

    //convert set to list
    const highlightedArray = Array.from(appState[currentMode].highlightedMarkers);

    //send coordinates to renderer to sync with table cells
    winRef.webContents.send("highlighted-coordinates", highlightedArray);

    updateMap("update");
}