import { spawn } from "child_process";
import fs from "fs";
import { paths, loadApiKeys } from "./main.js";

export async function initDictionaryHandlers(ipcMain) {

    //handle request from renderer to get dictionary data
    //get endpoint dictionary
    ipcMain.handle("get-endpoint-data", async () => {
        return readJSONFile(paths.ENDPOINT_DICTIONARY_PATH);
    });
    
    //get flagged dictionary
    ipcMain.handle("get-flagged-data", async () => {
        return readJSONFile(paths.FLAGGED_FILE_PATH);
    });

    //get trusted dictionary
    ipcMain.handle("get-trusted-data", async () => {
        return readJSONFile(paths.TRUSTED_FILE_PATH);
    });

    ipcMain.handle("get-scan-schedule", async () => {
        return readJSONFile(paths.SCAN_SCHEDULE_PATH);
    });

    //handle request to add security data to dictionary
    ipcMain.handle("fetch-security-data", async (event, ipAddress) => {
        const { VIRUSTOTAL_KEY, ABUSEIPDB_KEY } = loadApiKeys();

        if (!VIRUSTOTAL_KEY || !ABUSEIPDB_KEY) {
            return {
              error: "Missing API keys. Please configure them in the .env file.",
            };
        }

        return new Promise((resolve, reject) => {
            // const pythonProcess = spawn(paths.VENV_PYTHON, [paths.SECURITY_SCAN_SCRIPT, ipAddress]);
            const pythonProcess = spawn(paths.SYSTEM_PYTHON, [paths.SECURITY_SCAN_SCRIPT, ipAddress], {
                env: {
                  ...process.env,
                  VIRUSTOTAL_KEY,
                  ABUSEIPDB_KEY,
                },
            });

            let output = "";
            let errorOutput = "";

            pythonProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const jsonResponse = JSON.parse(output);
                        resolve(jsonResponse);
                    } catch (parseError) {
                        console.error("Error parsing JSON output:", parseError, "\nOutput:", output);
                        reject({ error: "Failed to parse security check response" });
                    }
                } else {
                    console.error("Python script error:", errorOutput);
                    reject({ error: "Security check script failed", details: errorOutput });
                }
            });
        });
    });

    //handle requests to update flagged/trusted dictionary data
    ipcMain.handle("update-flagged-trusted", async (event, { ip, status, logFile, reason }) => {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(paths.SYSTEM_PYTHON, [
                paths.FLAGGER_SCRIPT,
                "--ip", ip,
                "--status", status,
                "--log-file", logFile,
                "--reason", reason
            ]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result); //send result back to renderer
                    } catch (err) {
                        console.error("Failed to parse Python output:", err);
                        reject({ success: false, error: "Failed to parse Python output" });
                    }
                } else {
                    console.error("Python script error:", errorOutput);
                    reject({ success: false, error: errorOutput });
                }
            });
        });
    });
};

//utility function to read JSON file
function readJSONFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf-8").trim();
            if (!data) {
                return {};
            }
            return JSON.parse(data);
        } else {
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
    }
    return {}; 
}




