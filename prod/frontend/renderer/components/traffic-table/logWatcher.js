import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import {updateDisplay, fetchLogFiles} from "./displayTable.js" 
import { updateTimeIntervalFromLog, updateSelectedEndpoints } from "../traffic-graph/handleGraphConfig.js";

let logFile = {
    active: null,
    passive: null
};

//watch log file to update traffic table with new data
export async function watchLogFile(mode) {
    if (!logFile[mode]) return;
    window.electronAPI.watchLogFile(logFile[mode], (curr, prev) => {
        window.electronAPI.readLogFile(logFile[mode], (data) => {
            if (!data) {
                //console.warn("Error: Log file is empty or could not be read.");
                return;
            }
            try {
                const logData = JSON.parse(data.trim());
                if (!logData.scan_config || !logData.endpoints) {
                    //console.warn("Invalid log structure:", logData);
                    return;
                }
                //only update currently visible traffic table
                if (logData.scan_config.scanType === currentMode) {
                    updateDisplay(logData);
                }
               
            } catch (error) {
                //console.warn("Error parsing log file:", error);
            }
        });
    });
}

//init receive new logs from scan start event listeners as function
export async function initReceiveLogEvents() {

    //handle ACTIVE scan logs
    window.electronAPI.receive("active-log-file", async (filePath) => {
        //console.log("Received active-log-file event:", filePath);
        logFile.active = filePath.trim();
        await handleLogFile("active");
    });

    //handle PASSIVE scan logs
    window.electronAPI.receive("passive-log-file", async (filePath) => {
        //console.log("Received passive-log-file event:", filePath);
        logFile.passive = filePath.trim();
        await handleLogFile("passive");
    });
};

async function handleLogFile(mode) {
    await fetchLogFiles(); //add new log file to drop down

    if (elements[`log-select-${mode}`]) {
        const fileName = logFile[mode].split("/").pop();
        elements[`log-select-${mode}`].value = fileName;

        //update map/graph
        window.electronAPI.send("generate-map", fileName);
        updateTimeIntervalFromLog(fileName);
        updateSelectedEndpoints();

        watchLogFile(mode); //start watching log
    }
}

