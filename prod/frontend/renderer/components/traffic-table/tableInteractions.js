import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { updateDisplay, uiVars } from "./displayTable.js"; 
import { updateSelectedEndpoints } from "../traffic-graph/handleGraphConfig.js"; //update graph config dropdown 

//handle highlighting lat_long cell on table on row click
//this triggers map marker highlighting for matching coordinates 
export async function setupRowHighlighting() {
    document.querySelectorAll(`.traffic-row-${currentMode} [data-key='lat_long']`).forEach(latLngCell => {
        latLngCell.addEventListener("click", () => {
            const mapContainer = elements[`map-container-${currentMode}`];

            //only highlight if the map is visible
            if (!mapContainer || mapContainer.style.display === "none") {
                //console.log("Map is hidden. Highlighting skipped.");
                return;
            }

            const latLng = latLngCell.innerText.trim();
            if (latLng && latLng !== "Unknown") {
                const [lat, lng] = latLng.split(",").map(coord => parseFloat(coord.trim()));

                //console.log(`Lat/Long cell clicked: Sending marker update for [${lat}, ${lng}]`);

                //notify Electron to update map marker
                window.electronAPI.sendHighlightMarker(lat, lng);
            }
        });
    });
}

//init highlighting event listeners with function
export async function initHighlightTableEvents() {
    //sync highlighted table cells with map markers 
    window.electronAPI.receive("highlighted-coordinates", (highlightedArray) => {

        uiVars[currentMode].highlightedCoordinates.clear();
        highlightedArray.forEach(coord => uiVars[currentMode].highlightedCoordinates.add(coord));

        updateDisplay();
    });

    //MutationObserver to monitor `map-container` visibility
    const mapContainer = elements[`map-container-${currentMode}`];
    if (mapContainer) {
        const observer = new MutationObserver(() => {
            if (mapContainer.style.display === "none") {
                uiVars[currentMode].highlightedCoordinates.clear();
                updateDisplay(); 
            }
        });

        observer.observe(mapContainer, { attributes: true, attributeFilter: ["style"] });
    } else {
        console.error("Map container not found. MutationObserver not initialized.");
    }
}


//handle checkbox interactions for selecting table rows
//checkboxes used for providing data to graph and inspector components  
export async function setupRowSelectors(mode) {
    const vars = uiVars[currentMode];
    const selectAllCheckbox = elements[`select-all-${mode}`];
    const selectFiveCheckbox = elements[`select-five-${mode}`];
    const rowCheckboxes = document.querySelectorAll(`.row-checkbox-${mode}`);
    const individualScope = elements[`individual-endpoints-${mode}`];
    const parallelScope = elements[`parallel-endpoints-${mode}`];
    const inspectionContainer = elements[`inspection-container-${currentMode}`];

    if (!selectAllCheckbox || !selectFiveCheckbox || rowCheckboxes.length === 0) {
        return;
    }

    //restore previous selections
    rowCheckboxes.forEach(checkbox => {
        const ip = checkbox.closest("tr").dataset.rowId;
        checkbox.checked = vars.selectedEndpoints.has(ip);
    });

    //auto select all rows in table 
    selectAllCheckbox.addEventListener("change", function () {
        if (this.checked && inspectionContainer.style.display === "none") {

            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                vars.selectedEndpoints.add(checkbox.closest("tr").dataset.rowId);
            });

            selectFiveCheckbox.checked = false; 
            individualScope.checked = false; //auto toggle graph config scope
            parallelScope.checked = false;

        } else if (inspectionContainer.style.display !== "none"){
            selectAllCheckbox.checked = false;
        } else {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                vars.selectedEndpoints.delete(checkbox.closest("tr").dataset.rowId);
            });
        }
        updateSelectedEndpoints();
    });

    //auto select first five rows in table 
    selectFiveCheckbox.addEventListener("change", function () {
        const table = document.getElementById(`traffic-table-${currentMode}`);
        const currentRowCheckboxes = table.querySelectorAll(`.row-checkbox-${currentMode}`);
    
        if (this.checked && inspectionContainer.style.display === "none") {
            currentRowCheckboxes.forEach((checkbox, index) => {
                checkbox.checked = index < 5;
                const ip = checkbox.closest("tr").dataset.rowId;
                if (index < 5) {
                    vars.selectedEndpoints.add(ip);
                } else {
                    vars.selectedEndpoints.delete(ip);
                }
            });

            selectAllCheckbox.checked = false;
            individualScope.checked = false; //auto toggle graph config scope

        } else if (inspectionContainer.style.display !== "none") {
            selectFiveCheckbox.checked = false;
        } else {
            currentRowCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                vars.selectedEndpoints.delete(checkbox.closest("tr").dataset.rowId);
            });
        }
        updateSelectedEndpoints();
    });
    
    //enforce "Individual Mode" for graph config (Only 1 Endpoint Selected)
    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            
            const ip = checkbox.closest("tr").dataset.rowId;
            if (checkbox.checked) {
                vars.selectedEndpoints.add(ip);
                updateSelectedEndpoints();
            } else {
                vars.selectedEndpoints.delete(ip);
                updateSelectedEndpoints();
            }

            //enforce endpoint selection limit for graph config 
            if (individualScope.checked) { //disable all but 1
                rowCheckboxes.forEach(cb => {
                    if (cb !== this) {
                        cb.checked = false;
                        vars.selectedEndpoints.delete(cb.closest("tr").dataset.rowId);
                    }
                });
                selectAllCheckbox.checked = false;
                selectFiveCheckbox.checked = false;
                updateSelectedEndpoints();
            } else if (parallelScope.checked) { //disable all but 5
                const checkedRows = document.querySelectorAll(`.checkbox-cell input:checked`);
                if (checkedRows.length > 5) {
                    checkedRows.forEach((cb, index) => {
                        if (index >= 5) {
                            cb.checked = false;
                            vars.selectedEndpoints.delete(cb.closest("tr").dataset.rowId);
                        }
                    });
                }
                const checkedCount = checkedRows.length;
                rowCheckboxes.forEach(cb => {
                    cb.disabled = checkedCount >= 5 && !cb.checked;
                });
                selectAllCheckbox.checked = false;
                updateSelectedEndpoints();
            }
        });
    });
}

//enforce endpoint selection limit for graph config 
export function enforceGraphScope(scopeMode) {
    const rowCheckboxes = document.querySelectorAll(`.row-checkbox-${currentMode}`);
    const selectAllCheckbox = elements[`select-all-${currentMode}`];
    const selectFiveCheckbox = elements[`select-five-${currentMode}`];
    
    uiVars[currentMode].selectedEndpoints.clear();

    if (scopeMode === "parallel") { //max of 5
        rowCheckboxes.forEach((checkbox, index) => {
            const ip = checkbox.closest("tr").dataset.rowId;
            if (index < 5) {
                checkbox.checked = true;
                uiVars[currentMode].selectedEndpoints.add(ip);
            } else {
                checkbox.checked = false;
            }
        });
        selectAllCheckbox.checked = false;
        selectFiveCheckbox.checked = false;
    } 
    else if (scopeMode === "individual") { //max of 1
        rowCheckboxes.forEach((checkbox, index) => {
            const ip = checkbox.closest("tr").dataset.rowId;
            if (index === 0) {
                checkbox.checked = true;
                uiVars[currentMode].selectedEndpoints.add(ip);
            } else {
                checkbox.checked = false;
            }
        });
        selectAllCheckbox.checked = false;
        selectFiveCheckbox.checked = false;
    } 
    updateDisplay(); //sync table
    updateSelectedEndpoints(); //sync graph dropdown
}

