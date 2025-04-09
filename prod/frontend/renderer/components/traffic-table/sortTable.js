import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { updateDisplay, uiVars } from "./displayTable.js";

//update sorting dropdown based on visible columns.
export async function updateSortingOptions() {
    const sortSelect = elements[`sort-select-${currentMode}`];

    //define sortable columns
    const sortableColumns = {
        inbound: "Inbound Packets",
        outbound: "Outbound Packets",
        out_in_ratio: "Outbound/Inbound Ratio",
        avg_inbound_per_second: "Avg Inbound PPS",
        avg_outbound_per_second: "Avg Outbound PPS",
        avg_size: "Avg Packet Size",
        largest_packet: "Largest Packet",
        bytes_sent: "Total Bytes Sent",
        bytes_received: "Total Bytes Received",
        avg_outbound_bps: "Avg Outbound Bps",
        avg_inbound_bps: "Avg Inbound Bps",
        avg_iat: "Avg IAT",
        max_iat: "Max IAT",
        avg_ttl: "Avg TTL",
        max_ttl: "Max TTL",
        syn_count: "SYN Count",
        rst_count: "RST Count",
    };

    sortSelect.innerHTML = "";

    //add option for each selected column
    uiVars[currentMode].selectedColumns.forEach(column => {
        if (sortableColumns[column]) {  
            const option = document.createElement("option");
            option.value = column;
            option.textContent = sortableColumns[column];
            sortSelect.appendChild(option);
        }
    });

    //disable dropdown if no sortable columns are selected
    sortSelect.disabled = sortSelect.options.length === 0;
}

//sorting function
export async function sortTable(order = uiVars[currentMode].currentSortOrder, column = uiVars[currentMode].currentSortColumn) {
    if (!column || !order) return; 
    
    const table = document.getElementById(`traffic-table-${currentMode}`).getElementsByTagName("tbody")[0];
    const rows = Array.from(table.getElementsByTagName("tr"));

    rows.sort((a, b) => {
        const aValue = getCellValue(a, column);
        const bValue = getCellValue(b, column);
        return order === "asc" ? aValue - bValue : bValue - aValue;
    });

    rows.forEach(row => table.appendChild(row)); 
}

//extract cell values for sorting
function getCellValue(row, column) {
    const table = row.closest("table");
    const headers = table.querySelectorAll("thead th");

    let columnIndex = -1;
    headers.forEach((th, idx) => {
        if (th.dataset.key === column) {
            columnIndex = idx;
        }
    });

    //if not found skip
    if (columnIndex === -1) return 0;

    let cellValue = row.cells[columnIndex]?.innerText.trim() || "0";

    //convert to number
    cellValue = cellValue.replace(/\D/g, ""); 
    return parseFloat(cellValue) || 0;
}

//init sorting event listeners as function
export async function initSortTableEvents() {

    if (elements[`sort-asc-${currentMode}`]) {
        elements[`sort-asc-${currentMode}`].addEventListener("click", () => {
            uiVars[currentMode].currentSortOrder = "asc";
            uiVars[currentMode].currentSortColumn = elements[`sort-select-${currentMode}`].value;
            sortTable("asc");
        });
    }
    
    if (elements[`sort-desc-${currentMode}`]) {
        elements[`sort-desc-${currentMode}`].addEventListener("click", () => {
            uiVars[currentMode].currentSortOrder = "desc";
            uiVars[currentMode].currentSortColumn = elements[`sort-select-${currentMode}`].value;
            sortTable("desc");
        });
    }
    

    const columnToggle = elements[`column-toggle-${currentMode}`];
    const columnDropdown = elements[`column-dropdown-${currentMode}`]

    columnToggle.addEventListener("click", (event) => {
        columnDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
        if (!columnToggle.contains(event.target) && !columnDropdown) {
            columnDropdown.classList.remove("show");
        }
    });
    

    //apply selected columns without resetting log data
    const checkboxes = elements[`column-dropdown-${currentMode}`].querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            uiVars[currentMode].selectedColumns.length = 0; 
            uiVars[currentMode].selectedColumns.push("ip", ...Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value));
    
            updateDisplay();  
            updateSortingOptions();
        });
    });
    
    //initialize sorting dropdown when the page loads
    await updateSortingOptions();
};
