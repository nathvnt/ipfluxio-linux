import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { generateHistoricalTable } from "./historyTableDisplay.js";
import { generateSecurityTable } from "./securityTableDisplay.js";


//make sure only one endpoint on table can be selected at a time 
function validateSelectedEndpoint() {
    const inspectionContainer = elements[`inspection-container-${currentMode}`];
    if (!inspectionContainer || inspectionContainer.style.display === "none") return;

    const checkboxes = document.querySelectorAll(`.row-checkbox-${currentMode}`);
    const selectedEndpointSpan = elements[`selected-endpoint-${currentMode}`];
    const securityTableContainer = elements[`security-table-container-${currentMode}`];

    let selectedRow = null;
    let checkedCount = 0;

    checkboxes.forEach((cb) => {
        if (cb.checked) {
            checkedCount++;
            selectedRow = cb.closest("tr");
        }
    });

    if (checkedCount > 1) {
        checkboxes.forEach((cb) => {
            if (cb !== event.target) cb.checked = false; 
        });
        selectedRow = event.target.closest("tr");
    }

    //set selected endpoint inner text if row on table is selected
    const ipAddress = selectedRow
        ? selectedRow.querySelector("td[data-key='ip']")?.textContent.trim() || "Unknown"
        : "No endpoint selected";

    if (selectedEndpointSpan) { selectedEndpointSpan.textContent = ipAddress; }

    if (selectedRow && ipAddress !== "Unknown" && ipAddress !== "No endpoint selected") {
        if (securityTableContainer.style.display === "none") {
            handleHistoricalTable();
        } 
    }
}


//listen for endpoint inspection component to be visible
//validate selected endpoint when component becomes visible 
function monitorInspectionContainer() {
    const inspectionContainer = elements[`inspection-container-${currentMode}`];

    if (!inspectionContainer) return;

    const observer = new MutationObserver(() => {
        const isVisible = inspectionContainer.style.display !== "none";
        if (isVisible) {
            validateSelectedEndpoint();
        }
    });

    observer.observe(inspectionContainer, { attributes: true, attributeFilter: ["style"] });
}


async function handleHistoricalTable() {
    const selectedEndpointSpan = elements[`selected-endpoint-${currentMode}`];
    const historicalTableContainer = document.getElementById(`historical-table-container-${currentMode}`);

    if (!selectedEndpointSpan || !historicalTableContainer) return;

    const selectedIP = selectedEndpointSpan.textContent.trim();

    //validate selected endpoint contents
    if (selectedIP === "No endpoint selected" || selectedIP === "Unknown") {
        historicalTableContainer.innerHTML = "";
        historicalTableContainer.innerHTML = `<div class="error-message">No endpoint selected. Please select one from traffic table.</div>`;
        return;
    }
    //get endpoint dictionary and call to generate table with data for endpoint 
    try {
        const endpointData = await window.electronAPI.getEndpointData();
        const flaggedData = await window.electronAPI.getFlaggedData();
        const trustedData = await window.electronAPI.getTrustedData();
        
        if (endpointData.error) { historicalTableContainer.innerHTML = `<div class="error-message">${endpointData.error}</div>`; return; }

        const endpointInfo = endpointData[selectedIP];

        if (!endpointInfo || !endpointInfo.first_seen) {
            historicalTableContainer.innerHTML = `<div class="error-message">No historical data found for IP: ${selectedIP}</div>`;
            return;
        }        

        //check if ip is flagged or trusted
        let status = "N/A";
        if (flaggedData[selectedIP] && flaggedData[selectedIP].currently_flagged) {
            status = "Flagged";
        } else if (trustedData[selectedIP] && trustedData[selectedIP].currently_trusted) {
            status = "Trusted";
        }

        //inject generated table 
        historicalTableContainer.innerHTML = generateHistoricalTable(endpointInfo, status);

        document.querySelectorAll(".toggle-port-btn").forEach(button => {
            button.addEventListener("click", function () {
                const target = this.getAttribute("data-target");
                const preview = document.getElementById(`${target}-preview`);
                const full = document.getElementById(`${target}-full`);
    
                if (full.style.display === "none") {
                    preview.style.display = "none";
                    full.style.display = "inline";
                    this.textContent = "Show Less ▲";
                } else {
                    preview.style.display = "inline";
                    full.style.display = "none";
                    this.textContent = "Show More ▼";
                }
            });
        });

    } catch (error) {
        console.error("Error fetching endpoint data:", error);
        historicalTableContainer.innerHTML = `<div class="error-message">Error loading data.</div>`;
    }
};


export async function handleSecurityTable(mode) {
    const selectedEndpointSpan = elements[`selected-endpoint-${currentMode}`];
    const securityTableContainer = elements[`security-table-container-${currentMode}`];

    if (!selectedEndpointSpan || !securityTableContainer) return;

    const selectedIP = selectedEndpointSpan.textContent.trim();

    //validate selected endpoint contents
    if (selectedIP === "No endpoint selected" || selectedIP === "Unknown") {
        securityTableContainer.innerHTML = `<div class="error-message">No endpoint selected. Please select one from traffic table.</div>`;
        return;
    }
    //get endpoint dictionary and call to generate table with data for endpoint 
    try {
        let endpointData = await window.electronAPI.getEndpointData();

        if (endpointData.error) {
            securityTableContainer.innerHTML = `<div class="error-message">${endpointData.error}</div>`;
            return;
        }

        let endpointInfo = endpointData[selectedIP];

        if (mode === "automatic") {
            // Check if security data exists, display it if available, otherwise exit
            if (endpointInfo && endpointInfo.security_data) {
                securityTableContainer.innerHTML = generateSecurityTable(endpointInfo);
            } else if (endpointInfo && !endpointInfo.security_data) {
                securityTableContainer.innerHTML = `<div class="error-message">No security data found for IP: ${selectedIP}</div>`;
            }
            return; 
        }

        if (mode === "manual") {
            //if IP exists but has no security data, fetch it
            if (!endpointInfo) {
                securityTableContainer.innerHTML = `<div class="loading-message">Fetching security data for new IP...</div>`;
            } else if (endpointInfo && !endpointInfo.security_data) {
                securityTableContainer.innerHTML = `<div class="loading-message">Fetching security data...</div>`;
            } else if (endpointInfo && endpointInfo.security_data) {
                securityTableContainer.innerHTML = generateSecurityTable(endpointInfo);
                return;
            }

            //fetch security data
            let securityDataResponse = await window.electronAPI.fetchSecurityData(selectedIP);
            if (securityDataResponse.error) {
                securityTableContainer.innerHTML = `<div class="error-message">${securityDataResponse.error}</div>`;
                return;
            }

            //update and display the security table
            endpointData = await window.electronAPI.getEndpointData();
            endpointInfo = endpointData[selectedIP];

            securityTableContainer.innerHTML = generateSecurityTable(endpointInfo);
        }
    } catch (error) {
        console.error("Error fetching security data:", error);
        securityTableContainer.innerHTML = `<div class="error-message">Error loading security data.</div>`;
    }
};


//init event listeners with function
export async function initEndpointInspectorEvents() {

    //setup endpoint validation and mutatation observer
    validateSelectedEndpoint(); 
    monitorInspectionContainer();
    
    document.addEventListener("change", function (event) {
        const historicalDataTable = document.getElementById(`historical-table-container-${currentMode}`);

        if (event.target.matches(`.row-checkbox-${currentMode}`)) {
            validateSelectedEndpoint();

            if (historicalDataTable.style.display === "none") {
                handleSecurityTable("automatic");
            }
        };
    });
    
    //handle toggling endpoint dictionary and security scan tables
    document.querySelectorAll('.endpoint-toggle-input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const label = this.nextElementSibling;
            const historicalDataBtn = document.getElementById(`refresh-historical-data-${currentMode}`);
            const historicalDataTable = document.getElementById(`historical-table-container-${currentMode}`);
            const securityDataBtn = document.getElementById(`refresh-security-data-${currentMode}`);
            const securityDataTable = document.getElementById(`security-table-container-${currentMode}`);
            const selectedEndpointSpan = elements[`selected-endpoint-${currentMode}`];
    
            if (this.checked) {
                label.style.backgroundColor = '#D97706'; 
                historicalDataBtn.style.display = 'none';
                historicalDataTable.style.display = 'none';
                securityDataBtn.style.display = 'block';
                securityDataTable.style.display = 'flex';
                selectedEndpointSpan.style.color = '#D97706';

                if (historicalDataTable.style.display === "none") {
                    handleSecurityTable("automatic");
                } 
            } else {
                label.style.backgroundColor = '#00857f';
                historicalDataBtn.style.display = 'block';
                historicalDataTable.style.display = 'flex';
                securityDataBtn.style.display = 'none';
                securityDataTable.style.display = 'none';
                selectedEndpointSpan.style.color = '#00857f';
            }
        });
    });

    //handle refresh data button click 
    document.addEventListener("click", async function (event) {
        if (!event.target.matches(`#refresh-historical-data-${currentMode}`)) return;
        handleHistoricalTable();
    });

    //handle run security scan button click 
    document.addEventListener("click", async function (event) {
        if (!event.target.matches(`#refresh-security-data-${currentMode}`)) return;
        handleSecurityTable("manual");
    });
};

