import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { updateDisplay, uiVars } from "./displayTable.js";

//init event filter table listeners with function
export async function initFilterTableEvents() {

    elements[`filter-column-${currentMode}`].addEventListener("change", function () {
        const filterOptions = elements[`filter-options-${currentMode}`];
        filterOptions.innerHTML = ""; 

        const selectedColumn = this.value;
        if (!selectedColumn) return;

        //numeric columns
        const numericColumns = [
            "inbound", "outbound", "avg_size", "bytes_sent", "bytes_received",
            "avg_iat", "syn_count", "rst_count", "out_in_ratio", "average_ttl"
        ];

        if (numericColumns.includes(selectedColumn)) {
            filterOptions.innerHTML = `
                <select id="numeric-condition" class="config-dropdown">
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                </select>
                <input type="number" id="numeric-value" class="config-dropdown" placeholder="Enter value">
            `;
        } 

        //categorical: Protocols & Processes
        else if (selectedColumn === "protocols" || selectedColumn === "processes") {
            const existingOptions = getUniqueValues(selectedColumn);
            if (existingOptions.length === 0) {
                filterOptions.innerHTML = `<p>No data available for ${selectedColumn}</p>`;
                return;
            }

            filterOptions.innerHTML = `
                <select id="category-condition" class="config-dropdown">
                    <option value="includes">Includes</option>
                    <option value="does_not_include">Does not include</option>
                    <option value="includes_only">Includes only</option>
                </select>
                <select id="category-value" class="config-dropdown">
                    ${existingOptions.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
                </select>
            `;
        }

        //special case: Lat_Long 
        else if (selectedColumn === "location") {
            filterOptions.innerHTML = `
                <select id="latlong-condition" class="config-dropdown">
                    <option value="true">Has Location</option>
                    <option value="false">No Location</option>
                </select>
            `;
        }
    })


    //apply selected filters event listener
    elements[`add-filter-btn-${currentMode}`].addEventListener("click", function () {
        const selectedColumn = elements[`filter-column-${currentMode}`].value;
        if (!selectedColumn) return;

        let filter = { column: selectedColumn };

        if (document.getElementById("numeric-condition")) {
            filter.condition = document.getElementById("numeric-condition").value;
            filter.value = parseFloat(document.getElementById("numeric-value").value);
        } else if (document.getElementById("category-condition")) {
            filter.condition = document.getElementById("category-condition").value;
            filter.value = document.getElementById("category-value").value;
        } else if (document.getElementById("latlong-condition")) {
            filter.condition = document.getElementById("latlong-condition").value === "true";
        }

        //check for duplicate filter
        const isDuplicate = uiVars[currentMode].activeFilters.some(existingFilter => 
            existingFilter.column === filter.column &&
            existingFilter.condition === filter.condition &&
            existingFilter.value === filter.value
        );

        if (isDuplicate) {
            //console.log("Duplicate filter detected, not adding.");
            return; 
        }

        uiVars[currentMode].activeFilters.push(filter);
        updateFiltersDisplay();
        updateDisplay();

        //reset filter column dropdown and clear filter options
        elements[`filter-column-${currentMode}`].value = ""; 
        elements[`filter-options-${currentMode}`].innerHTML = ""; 
    });


    //dropdown toggle event listener
    const filterToggle = elements[`toggle-filters-${currentMode}`];
    const filterDropdown = elements[`filter-dropdown-${currentMode}`]

    filterToggle.addEventListener("click", (event) => {
        filterDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
        if (!filterToggle.contains(event.target) && !filterDropdown) {
            filterDropdown.classList.remove("show");
        }
    });

    //initialize filters display on page load
    updateFiltersDisplay();
};

//--------------------------------------------------------------------------------------------------
//functions for filtering table contents -----------------------------------------------------------

//extract unique values from the log data
function getUniqueValues(columnKey) {
    const values = new Set();
    Object.values(uiVars[currentMode].currentLogData.endpoints).forEach(endpoint => {
        if (Array.isArray(endpoint[columnKey])) {
            endpoint[columnKey].forEach(item => values.add(item));
        }
    });

    return Array.from(values);
}

//display active filters in a dropdown with individual remove buttons
async function updateFiltersDisplay() {
    const vars = uiVars[currentMode];
    const filterDropdown = elements[`filter-dropdown-${currentMode}`];
    const toggleFilters = elements[`toggle-filters-${currentMode}`];

    if (!filterDropdown) {
        console.error(`filter-dropdown-${currentMode} not found!`);
        return;
    }
    if (!toggleFilters) {
        console.error(`toggle-filters-${currentMode} not found!`);
        return;
    }

    //generate the list of applied filters
    filterDropdown.innerHTML = vars.activeFilters.length > 0
        ? vars.activeFilters.map((f, index) => `
            <div class="filter-item">
                <span>${f.column} ${f.condition} ${f.value || ""}</span>
                <button class="remove-filter" data-index="${index}">X</button>
            </div>
        `).join("")
        : "<p style='padding: 5px; font-size: 14px;'>No filters applied.</p>";

    toggleFilters.innerHTML = vars.activeFilters.length > 0
        ? `Active Filters (${vars.activeFilters.length}) <span>▼</span>`
        : "Active Filters <span>▼</span>";

    //attach event listeners to remove filter buttons
    document.querySelectorAll(".remove-filter").forEach(button => {
        button.addEventListener("click", function () {
            const index = parseInt(this.dataset.index, 10);
            vars.activeFilters.splice(index, 1);
            updateFiltersDisplay();
            updateDisplay();
        });
    });

    //clear all filters
    elements[`clear-filters-btn-${currentMode}`]?.addEventListener("click", function () {
        vars.activeFilters.length = 0;
        updateFiltersDisplay();
        updateDisplay();
        elements[`filter-column-${currentMode}`].value = ""; 
        elements[`filter-options-${currentMode}`].innerHTML = ""; 
    });
}


//Update the displayed traffic log based on active filters
function applyFilters(endpoint) {
    return uiVars[currentMode].activeFilters.every(filter => {
        const value = endpoint[filter.column];

        if (typeof value === "number") {
            return filter.condition === ">"
                ? value > filter.value
                : value < filter.value;
        }

        if (Array.isArray(value)) {
            if (filter.condition === "includes") return value.includes(filter.value);
            if (filter.condition === "does_not_include") return !value.includes(filter.value);
            if (filter.condition === "includes_only") return value.length === 1 && value[0] === filter.value;
        }

        if (filter.column === "location") {
            let location_value = value;
            location_value = endpoint.location;
            return filter.condition ? location_value !== null : location_value === null;
        }

        return true;
    });
}

//used in updateDisplay function to update table with filtered data set
export async function getFilteredLogData(logData) {
    if (!logData || !logData.endpoints) return logData;

    const filteredEndpoints = Object.fromEntries(
        Object.entries(logData.endpoints).filter(([_, endpoint]) => applyFilters(endpoint))
    );

    const filteredData = { ...logData, endpoints: filteredEndpoints };

    return filteredData;
}