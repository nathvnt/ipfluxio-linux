import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { getFilteredLogData, initFilterTableEvents } from "./filterTable.js";
import { initReceiveLogEvents } from "./logWatcher.js"
import { sortTable, updateSortingOptions, initSortTableEvents } from "./sortTable.js";
import { setupRowHighlighting, setupRowSelectors, initHighlightTableEvents } from "./tableInteractions.js";
import { updateTimeIntervalFromLog, updateSelectedEndpoints } from "../traffic-graph/handleGraphConfig.js";
import { generatePortDropdown } from '../endpoint-inspector/historyTableDisplay.js';

export const uiVars = {
    active: {
        currentLogData: null,
        filteredData: {},
        activeFilters: [],
        selectedEndpoints: new Set(),
        highlightedCoordinates: new Set(),
        selectedColumns: [
            "flagged_trusted", "source", "destination", "ip", "inbound", "outbound", "avg_size", 
            "avg_outbound_bps", "avg_inbound_bps", "port_numbers", "protocols", "processes", "lat_long", "avg_iat"
        ],
        currentSortColumn: null,
        currentSortOrder: null
    },
    passive: {
        currentLogData: null,
        filteredData: {},
        activeFilters: [],
        selectedEndpoints: new Set(),
        highlightedCoordinates: new Set(),
        selectedColumns: [
            "flagged_trusted", "source", "destination", "ip", "inbound", "outbound", "avg_size", 
            "avg_outbound_bps", "avg_inbound_bps", "port_numbers", "protocols", "processes", "lat_long", "avg_iat"
        ],
        currentSortColumn: null,
        currentSortOrder: null
    }
};


//update traffic log table dynamically
export async function updateDisplay(logData = null) {
    const vars = uiVars[currentMode];

    const flaggedData = await window.electronAPI.getFlaggedData();
    const trustedData = await window.electronAPI.getTrustedData();

    vars.filteredData = logData 
        ? await getFilteredLogData(logData) 
        : await getFilteredLogData(vars.currentLogData);

    //ensure current mode and log data scanType matches 
    if (vars.filteredData?.scan_config?.scanType && vars.filteredData.scan_config.scanType !== currentMode) {
        //console.log(`Mismatched log type: Expected ${currentMode}, but got ${vars.filteredData.scan_config.scanType}. Exiting updateDisplay.`);
        vars.filteredData = {};
    }

    if (!vars.filteredData || !vars.filteredData.endpoints || Object.keys(vars.filteredData.endpoints).length === 0) {
        //console.log("No matching data after filtering!");
    } 

    const trafficLog = elements[`traffic-log-${currentMode}`];

    //extract scan configuration
    let scanConfig = vars.filteredData?.scan_config ?? {}; 
    const trafficDirection = scanConfig.trafficDirection || "bi-directional"; 

    const allColumns = [
        { key: "ip", label: "IP Address" },
        { key: "flagged_trusted", label: "Action" },
        { key: "source", label: "Source" },
        { key: "destination", label: "Destination" },
        { key: "inbound", label: "Inbound" },
        { key: "outbound", label: "Outbound" },
        { key: "out_in_ratio", label: "Out/In Ratio" },
        { key: "avg_inbound_per_second" , label: "Avg PPS In" },
        { key: "avg_outbound_per_second" , label: "Avg PPS Out" },
        { key: "largest_packet" , label: "Largest Packet" },
        { key: "avg_size", label: "Avg Size" },
        { key: "bytes_sent", label: "Bytes Sent" },
        { key: "bytes_received", label: "Bytes Received" },
        { key: "avg_outbound_bps" , label: "Avg Bps Out" },
        { key: "avg_inbound_bps" , label: "Avg Bps In" },
        { key: "port_numbers" , label: "Ports" },
        { key: "protocols", label: "Protocols" },
        { key: "processes", label: "Processes" },
        { key: "avg_iat", label: "Avg IAT" },
        { key: "max_iat", label: "Max IAT" },
        { key: "avg_ttl", label: "Avg TTL" },
        { key: "max_ttl", label: "Max TTL" },
        { key: "syn_count", label: "SYN Count" },
        { key: "rst_count", label: "RST Count" },
        { key: "lat_long", label: "Lat/Long" }
    ];

    //adjust columns based on traffic direction
    let visibleColumns = ["ip", "flagged_trusted", ...vars.selectedColumns];

    if (trafficDirection === "bi-directional") {
        visibleColumns = visibleColumns.filter(col => col !== "source" && col !== "destination");
    }
    else if (trafficDirection === "inbound") {
        visibleColumns = visibleColumns.filter(col => col !== "outbound" && col !== "out_in_ratio" && col !== "source");
    } else if (trafficDirection === "outbound") {
        visibleColumns = visibleColumns.filter(col => col !== "inbound" && col !== "out_in_ratio" && col !== "destination");
    }

    //generate scan configuration table
    let scanConfigHTML = `
        <table border="1" id="scan-config-table-${currentMode}" class="table scan-config-table">
            <thead>
                
                <tr>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration (seconds)</th>
                    <th>Network Interface</th>
                    <th>Traffic Direction</th>
                    <th>Exclude Private Traffic</th>
                    <th>Protocols</th>

                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${scanConfig.start || "N/A"}</td>
                    <td>${scanConfig.end || "N/A"}</td>
                    <td>${scanConfig.duration || "N/A"}</td>
                    <td>${scanConfig.networkInterface || "N/A"}</td>
                    <td>${scanConfig.trafficDirection || "N/A"}</td>
                    <td>${scanConfig.excludePrivate ? "Yes" : "No"}</td>
                    <td>${scanConfig.protocols ? scanConfig.protocols.join(", ") : "N/A"}</td>
                </tr>
            </tbody>
        </table>
    `;

    //generate traffic log table
    let trafficTableHTML = `
        <table border="1" id="traffic-table-${currentMode}" class="table traffic-table mt-10">
            <thead>
                <tr>
                    ${allColumns
                        .filter(col => visibleColumns.includes(col.key))
                        .map(col => `<th data-key="${col.key}">${col.label}</th>`)
                        .join("")}
                </tr>
            </thead>
            <tbody>
                ${vars.filteredData && vars.filteredData.endpoints && Object.keys(vars.filteredData.endpoints).length > 0
                    ? Object.keys(vars.filteredData.endpoints)
                        .map(ip => {
                            const endpoint = vars.filteredData.endpoints[ip] || {};
                            const location = endpoint.location ? `${endpoint.location[0]}, ${endpoint.location[1]}` : "Unknown";

                            //determine flagged/trusted status
                            let flaggedState = flaggedData[ip]?.currently_flagged ?? false;
                            let trustedState = trustedData[ip]?.currently_trusted ?? false;
                            let dropdownValue = "none";
                            let bgColor = ""; 
                            
                            if (flaggedState) {
                                dropdownValue = "flagged";
                                bgColor = "background-color: #D97706; transition: background-color 0.2s ease-in-out;";
                            } else if (trustedState) {
                                dropdownValue = "trusted";
                                bgColor = "background-color: #00857f; transition: background-color 0.2s ease-in-out;";
                            }

                            //determine if the checkbox should be checked
                            const isChecked = vars.selectedEndpoints.has(ip) ? "checked" : "";

                            //check if the map is visible
                            const mapContainer = elements[`map-container-${currentMode}`];
                            const isMapVisible = mapContainer && mapContainer.style.display !== "none";
                            
                            //check if the IP's lat/long is in highlightedCoordinates
                            let latLngStyle = "";
                            if (isMapVisible && location !== "Unknown") {
                                let latLngTrimmed = location.replace(/\s+/g, "").trim(); 
                                let [lat, lng] = latLngTrimmed.split(",").map(coord => parseFloat(coord).toFixed(4));
                            
                                if (vars.highlightedCoordinates.has(`${lat},${lng}`)) {
                                    latLngStyle = "background-color: #10B98199; color: white; transition: background-color 0.2s ease-in-out;";
                                }
                            }

                            return `
                                <tr class="traffic-row-${currentMode} traffic-row" data-row-id="${ip}">
                                    ${allColumns
                                        .filter(col => visibleColumns.includes(col.key))
                                        .map(col => {
                                            let value = col.key === "ip" ? ip : (endpoint[col.key] ?? "N/A"); 
                                            if (col.key === "lat_long") {
                                                value = location;
                                                return `<td data-key="${col.key}" style="${latLngStyle}">${value}</td>`;
                                            }
                                            if (col.key === "port_numbers") {
                                                return `<td data-key="${col.key}">${generatePortDropdown(endpoint[col.key])}</td>`;
                                            }
                                            if (col.key === "protocols" || col.key === "processes") value = Array.isArray(value) ? value.join(", ") : "N/A";
                                            if (col.key === "avg_iat" || col.key === "average_ttl") value = value !== "N/A" ? value.toFixed(2) : "N/A";
                                            if (col.key === "bytes_sent" || col.key === "bytes_received") value += value !== "N/A" ? " B" : "";
                                             //handle flagged_trusted column with dropdown
                                            if (col.key === "flagged_trusted") {
                                                return `
                                                    <td data-key="${col.key}" style="${bgColor}">
                                                        <select class="flagged-trusted-dropdown config-item" data-ip="${ip}">
                                                            <option value="none" ${dropdownValue === "none" ? "selected" : ""}>None</option>
                                                            <option value="flagged" ${dropdownValue === "flagged" ? "selected" : ""}>Flag</option>
                                                            <option value="trusted" ${dropdownValue === "trusted" ? "selected" : ""}>Trust</option>
                                                        </select>
                                                    </td>
                                                `;
                                            }

                                            return `<td data-key="${col.key}">${value}</td>`;
                                        })
                                        .join("")}
                                    <td class="checkbox-cell"><input type="checkbox" class="row-checkbox-${currentMode}" ${isChecked}></td>
                                </tr>
                            `;
                        })
                        .join("")
                    : `<tr><td colspan="${visibleColumns.length}">No network traffic log detected yet.</td></tr>`}
            </tbody>
        </table>
    `;

    //display both tables
    trafficLog.innerHTML = scanConfigHTML + trafficTableHTML;

    await sortTable();

    document.addEventListener("DOMContentLoaded", async () => {
        await updateSortingOptions(visibleColumns); 
    });
    

    if (document.querySelectorAll(`.traffic-row-${currentMode}`).length > 0) {
        setupRowHighlighting();
    }

    setupRowSelectors(currentMode);
};

//loads all log files into dropdown menu 
export async function fetchLogFiles() {
    if (!elements[`log-select-${currentMode}`]) return;

    try {
        //fetch logs based on currentMode
        const logFiles = await window.electronAPI.fetchLogFiles(currentMode);
        elements[`log-select-${currentMode}`].innerHTML = `<option value="">Select a log file...</option>`; 

        if (logFiles.length > 0) {
            logFiles.forEach(filename => {
                let option = document.createElement("option");
                option.value = filename;
                option.textContent = filename;
                elements[`log-select-${currentMode}`].appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to fetch log files:", error);
    }
};

//init event listeners with function
export async function initDisplayTableEvents() {
    const vars = uiVars[currentMode];
    await fetchLogFiles(); 

    //handle updating table when load log button is clicked
    if (elements[`load-log-btn-${currentMode}`]) {
        elements[`load-log-btn-${currentMode}`].addEventListener("click", async () => {
            if (!elements[`log-select-${currentMode}`] || !elements[`log-select-${currentMode}`].value) {
                console.warn("No log file selected.");
                return;
            }

            const selectedLogFile = elements[`log-select-${currentMode}`].value;
            const logPath = `/var/log/ipfluxio/logs/${currentMode === "active" ? "active" : "baseline"}/${selectedLogFile}`;
            //const logPath = `backend/logs/${currentMode === "active" ? "active" : "baseline"}/${selectedLogFile}`;
            //console.log(`Loading selected log file: ${logPath}`);

            //read and display the log file
            window.electronAPI.readLogFile(logPath, (data) => {
                if (data) {
                    try {
                        vars.currentLogData = JSON.parse(data);
                        updateDisplay(vars.currentLogData); //update table display
                        window.electronAPI.logEvent(`[${selectedLogFile} LOADED]`);
                        //clear stored highlighted locations and selected rows
                        vars.highlightedCoordinates.clear();
                        vars.selectedEndpoints.clear();
                        //update graph config
                        updateTimeIntervalFromLog(selectedLogFile);
                        updateSelectedEndpoints();
                    } catch (error) {
                        console.error("Error parsing log file:", error);
                    }
                } else {
                    console.error("Failed to read log file.");
                }
            });

            //also update the map with this log file
            //console.log(`Updating map with selected log: ${selectedLogFile}`);
            window.electronAPI.send("generate-map", selectedLogFile);
        });
    } else {
        console.error("load-log-btn not found in DOM.");
    }

    //-------------------------------------------------------------------------------------

    //handle flagging/trusting
    document.addEventListener("change", async function (event) {
        if (event.target.classList.contains("flagged-trusted-dropdown")) {
            const ip = event.target.getAttribute("data-ip");
            const newStatus = event.target.value;
            const logFile = elements[`log-select-${currentMode}`].value;
            const reason = "Manually updated by user";
    
            //console.log(`Updating flagged_trusted for ${ip} to ${newStatus}`);
    
            //send update request to Electron main process
            const result = await  window.electronAPI.updateFlaggedTrusted({ ip, status: newStatus, logFile, reason });
    
            //console.log("Update response:", result);
            updateDisplay();
        }
    });    
};


//function for intializing all of traffic table components event listeners in a way that prevents race conditions 
//used after component html is injected and global DOM elements are defined in load mode script(s)
export async function initTrafficTableEvents() {
    initDisplayTableEvents();
    initReceiveLogEvents();
    initSortTableEvents();
    initFilterTableEvents();
    initHighlightTableEvents();
};
