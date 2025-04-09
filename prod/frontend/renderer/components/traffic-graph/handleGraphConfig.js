import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { uiVars } from "../traffic-table/displayTable.js"; 
import { enforceGraphScope } from "../traffic-table/tableInteractions.js" //update selected table tows with scope rules 

export const graphCFG = {
    active: {
        generateClicked: false,
        logFile: null,
        logPath: null,
        logData: null,
        startTimeInput: null,
        endTimeInput: null,
        startTimeUnix: null,
        endTimeUnix: null,
        selectedScope: null,
        selectedMetrics: new Set(),
        selectedEndpoints: new Set(),
        liveCheckbox: null,
        liveGraphInterval: null,
        liveCheckCounter: 0,
        series: [],
        colorIndex: 0,
        echarts: window.echarts
    },
    passive: {
        generateClicked: false,
        logFile: null,
        logPath: null,
        logData: null,
        startTimeInput: null,
        endTimeInput: null,
        startTimeUnix: null,
        endTimeUnix: null,
        selectedScope: null,
        selectedMetrics: new Set(),
        selectedEndpoints: new Set(),
        liveCheckbox: null,
        liveGraphInterval: null,
        liveCheckCounter: 0,
        series: [],
        colorIndex: 0,
        echarts: window.echarts
    }
};


export async function validateGraphConfig() {
    const generateGraphBtn = elements[`generate-graph-btn-${currentMode}`];
    const config = graphCFG[currentMode];

    //initial general validation
    let valid = config.selectedScope &&
                config.selectedMetrics.size > 0 &&
                config.startTimeInput && config.startTimeInput.value &&
                config.endTimeInput && config.endTimeInput.value;

    //scope-specific validation
    if (config.selectedScope === "individual") {
        valid = valid &&
                config.selectedEndpoints.size === 1 &&
                config.selectedMetrics.size < 6;

    } else if (config.selectedScope === "combined") {
        valid = valid &&
                config.selectedMetrics.size < 6;

    } else if (config.selectedScope === "parallel") {
        valid = valid &&
                config.selectedEndpoints.size <= 5 && 
                config.selectedMetrics.size === 1;
    }

    generateGraphBtn.disabled = !valid;
    return valid;
}

//-------functions and event listeners for managing graph configuration--------------------------------------------
//-----------------------------------------------------------------------------------------------------------------

//AUTO SET TIME INTERVAL////////

//inject scan config time interval when log file is loaded into table 
export async function updateTimeIntervalFromLog(logFile) {
    
    if (!logFile) return;
    graphCFG[currentMode].logFile = logFile;
    //graphCFG[currentMode].logPath = `backend/logs/${currentMode === "active" ? "active" : "baseline"}/${logFile}`;
    graphCFG[currentMode].logPath = `/var/log/ipfluxio/logs/${currentMode === "active" ? "active" : "baseline"}/${logFile}`;


    //extract log data
    graphCFG[currentMode].logData = await new Promise((resolve, reject) => {
        window.electronAPI.readLogFile(graphCFG[currentMode].logPath, (data) => {
            if (data) {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    console.error("Error parsing log file:", error);
                    reject(null);
                }
            } else {
                console.error("Failed to read log file.");
                reject(null);
            }
        });
    });

    if (!graphCFG[currentMode].logData || !graphCFG[currentMode].logData.scan_config) {
        console.warn("No valid scan config found in log data.");
        return;
    }
    //store start/end times in DOM and graph config 
    if (graphCFG[currentMode].logData.scan_config.start) {
        graphCFG[currentMode].startTimeInput.value = graphCFG[currentMode].logData.scan_config.start.replace(" ", "T");
    }
    if (graphCFG[currentMode].logData.scan_config.end) {
        graphCFG[currentMode].endTimeInput.value = graphCFG[currentMode].logData.scan_config.end.replace(" ", "T");
    }
}


//-----------------------------------------------------------------------------------------------------------------
////MANGE DATA SCOPE/////////////////////

//init graph data scope event listeners with function
export async function initGraphDataScopeEvents() {

    //sync date time inputs with graph config variables 
    graphCFG[currentMode].startTimeInput = elements[`graph-start-${currentMode}`];
    graphCFG[currentMode].endTimeInput = elements[`graph-end-${currentMode}`];

    const individualScope = elements[`individual-endpoints-${currentMode}`];
    const parallelScope = elements[`parallel-endpoints-${currentMode}`];
    const combinedScope = elements[`combined-endpoints-${currentMode}`];
    const dataPointCheckboxes = document.querySelectorAll(`#data-point-dropdown-${currentMode} input`);

    //enforce allowed number of endpoints/metrics based on scope selection 
    async function enforceScopeRules(event) {
        const clickedCheckbox = event.target;
        const endpointCheckboxes = document.querySelectorAll(`.row-checkbox-${currentMode}`);
        
        if (clickedCheckbox === individualScope) {
            combinedScope.checked = false;
            parallelScope.checked = false;
            endpointCheckboxes.forEach(cb => cb.disabled = false);

            //limit to 1 endpoint & 5 metrics 
            if (individualScope.checked) {
                graphCFG[currentMode].selectedScope = "individual";
                enforceGraphScope("individual"); //call to tableInteractions.js in traffic-table
                if (dataPointCheckboxes.length > 6) { 
                    dataPointCheckboxes.forEach((cb, index) => {
                        if (index >= 5) cb.checked = false; 
                    });
                }
            }
        } else if (clickedCheckbox === combinedScope) {
            individualScope.checked = false;
            parallelScope.checked = false;
            endpointCheckboxes.forEach(cb => cb.disabled = false);

            //no endpoint limit, 5 metrics max
            if (combinedScope.checked) {
                graphCFG[currentMode].selectedScope = "combined";
                if (dataPointCheckboxes.length > 6) { 
                    dataPointCheckboxes.forEach((cb, index) => {
                        if (index >= 5) cb.checked = false; 
                    });
                }
            }
        } else if (clickedCheckbox === parallelScope) {
            combinedScope.checked = false;
            individualScope.checked = false;

            //limit to 5 endpoints & 1 metric
            if (parallelScope.checked) {
                graphCFG[currentMode].selectedScope = "parallel";
                enforceGraphScope("parallel");
                if (dataPointCheckboxes.length > 1) {
                    dataPointCheckboxes.forEach((cb, index) => {
                        if (index > 0) cb.checked = false; 
                    });
                }
            }
        }
    
        //enable metric selection checkboxes if at least one scope is selected
        const isScopeSelected = individualScope.checked || combinedScope.checked || parallelScope.checked;
        dataPointCheckboxes.forEach((cb) => (cb.disabled = !isScopeSelected));

        syncSelectedMetrics();
        validateGraphConfig();
    }
    
    function enforceDataPointSelectionLimit() {
        //enforce limit of 1 
        if (parallelScope.checked) {
            dataPointCheckboxes.forEach(cb => {
                if (cb !== event.target) cb.checked = false;
            });
        }
        //enforce limit of 5 
        if (individualScope.checked || combinedScope.checked) {
            const checkedDataPoints = document.querySelectorAll(`#data-point-dropdown-${currentMode} input:checked`);
            if (checkedDataPoints.length > 5) {
                checkedDataPoints.forEach((cb, index) => {
                    if (index >= 5) cb.checked = false; 
                });
            }
            //disable all but 5
            const selectedCount = checkedDataPoints.length;
            dataPointCheckboxes.forEach(cb => {
                cb.disabled = selectedCount >= 5 && !cb.checked;
            });
        }
        syncSelectedMetrics();
        validateGraphConfig();
    }

    //sync dom with graph config
    function syncSelectedMetrics() {
        graphCFG[currentMode].selectedMetrics.clear();
        const checkedMetrics = document.querySelectorAll(`#data-point-dropdown-${currentMode} input[type="checkbox"]:checked`);
        checkedMetrics.forEach(cb => graphCFG[currentMode].selectedMetrics.add(cb.value));
    }

    //attach event listeners to enforce rules 
    individualScope.addEventListener("change", enforceScopeRules);
    combinedScope.addEventListener("change", enforceScopeRules);
    parallelScope.addEventListener("change", enforceScopeRules);

    dataPointCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", enforceDataPointSelectionLimit);
    });
};


//update graph config selected endpoints dropdown 
export async function updateSelectedEndpoints() {

    if (!elements[`selected-endpoints-dropdown-${currentMode}`]) return;

    elements[`selected-endpoints-dropdown-${currentMode}`].innerHTML = ""; 
    graphCFG[currentMode].selectedEndpoints.clear();

    //sync graph config with traffic table data 
    uiVars[currentMode].selectedEndpoints.forEach(ip => { 
        graphCFG[currentMode].selectedEndpoints.add(ip);
    });

    if (uiVars[currentMode].selectedEndpoints.size === 0) {
        elements[`selected-endpoints-dropdown-${currentMode}`].innerHTML = `<span class="endpoint-dropdown-item">No endpoints selected</span>`;
        return;
    }

    uiVars[currentMode].selectedEndpoints.forEach(ip => {
        const row = document.querySelector(`tr[data-row-id="${ip}"]`);
        if (!row) return; 

        const ipAddress = row.querySelector("td[data-key='ip']")?.textContent.trim() || "Unknown";
        const processCell = row.querySelector("td[data-key='processes']");
        const process = processCell ? processCell.textContent.trim() : "N/A";

        const endpointEntry = document.createElement("div");
        endpointEntry.classList.add("endpoint-dropdown-item");
        endpointEntry.textContent = `${ipAddress} - ${process}`;
        elements[`selected-endpoints-dropdown-${currentMode}`].appendChild(endpointEntry);
    });

    validateGraphConfig();
}



//init event listeners for toggling drop down menus 
export async function initGraphDropdownEvents() {

    //disable by default (enable after scope is selected)
    document.querySelectorAll(`#data-point-dropdown-${currentMode} input, .row-checkbox`).forEach((el) => {
        el.disabled = true;
    });

    //selected metrics dropdown toggle
    const dataPointToggle = elements[`data-point-toggle-${currentMode}`];
    const dataPointDropdown = elements[`data-point-dropdown-${currentMode}`];

    if (dataPointToggle && dataPointDropdown) {
        dataPointToggle.addEventListener("click", () => {
            dataPointDropdown.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!dataPointToggle.contains(event.target) && !dataPointDropdown.contains(event.target)) {
                dataPointDropdown.classList.remove("show");
            }
        });
    }

    //add selected metrics to graph config 
    document.addEventListener("change", (event) => {
        if (event.target.matches(`#data-point-dropdown-${currentMode} input[type="checkbox"]`)) {
            const metric = event.target.value;
            if (event.target.checked) {
                graphCFG[currentMode].selectedMetrics.add(metric);
            } else {
                graphCFG[currentMode].selectedMetrics.delete(metric);
            }

            validateGraphConfig(); 
        }
    });

    //selected endpoints dropdown toggle
    const selectedEndpointsToggle = elements[`selected-endpoints-toggle-${currentMode}`];
    const selectedEndpointsDropdown = elements[`selected-endpoints-dropdown-${currentMode}`];

    if (selectedEndpointsToggle && selectedEndpointsDropdown) {
        selectedEndpointsToggle.addEventListener("click", () => {
            selectedEndpointsDropdown.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!selectedEndpointsToggle.contains(event.target) && !selectedEndpointsDropdown.contains(event.target)) {
                selectedEndpointsDropdown.classList.remove("show");
            }
        });
    }

    //listen for changes to live graph checkox 
    const liveCheckbox = elements[`attach-live-${currentMode}`];

    if (liveCheckbox) {
        liveCheckbox.addEventListener("change", () => {
            graphCFG[currentMode].liveCheckbox = liveCheckbox.checked; 
        });
        //set on load 
        graphCFG[currentMode].liveCheckbox = liveCheckbox.checked;
    }

    //add already selected endpoints on load
    updateSelectedEndpoints();
};