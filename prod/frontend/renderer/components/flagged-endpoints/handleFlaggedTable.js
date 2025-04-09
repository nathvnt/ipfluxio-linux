import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";

export async function updateFlaggedTable() {
    const flaggedData = await window.electronAPI.getFlaggedData();
    const tableContainer = elements[`flagged-endpoints-table-wrapper-${currentMode}`];

    if (!tableContainer) {
        console.error(`Table container not found: flagged-endpoints-table-flagged-${currentMode}`);
        return;
    }

    //check currently_flagged status
    const activeFlaggedEntries = Object.keys(flaggedData)
        .filter(ip => flaggedData[ip].currently_flagged)
        .reduce((obj, key) => {
            obj[key] = flaggedData[key];
            return obj;
        }, {});

    let tableHTML = `
        <table id="flagged-table-${currentMode}" class="table flagged-table">
            <thead>
                <tr>
                    <th>IP Address</th>
                    <th>First Time Flagged</th>
                    <th>Last Time Flagged</th>
                    <th>History</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${
                    Object.keys(activeFlaggedEntries).length > 0
                        ? Object.keys(activeFlaggedEntries).map(ip => {
                            const data = activeFlaggedEntries[ip];
                            return `
                                <tr>
                                    <td class="ip">${data.ip}</td>
                                    <td>${data.first_flagged}</td>
                                    <td>${data.last_flagged}</td>
                                    <td>
                                        <div class="toggle-history-btn config-item" data-ip="${ip}">Show History ▼</div>
                                    </td>
                                    <td>
                                        <select class="flagged-action-dropdown config-item" data-ip="${ip}">
                                            <option value="flagged" selected>Flag</option>
                                            <option value="trusted">Trust</option>
                                            <option value="none">Remove</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr class="history-row" id="history-${ip}" style="display:none;">
                                    <td colspan="5">
                                        ${generateHistoryTable(data.history)}
                                    </td>
                                </tr>
                            `;
                        }).join("")
                    : `<tr><td colspan="5" style="text-align:center;">No actively flagged endpoints found.</td></tr>`
                }
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;

    //dropdown 'actions' event listeners
    document.querySelectorAll(".flagged-action-dropdown").forEach(dropdown => {
        dropdown.addEventListener("change", async function () {
            const ip = this.getAttribute("data-ip");
            const newStatus = this.value;
            //console.log(`Updating status for ${ip} to ${newStatus}`);
            const data = activeFlaggedEntries[ip];
            const logFile = data.last_flagged_log || "unknown.log";
            const reason = `Manually updated to ${newStatus}`;

            //update flagged dictionary
            await window.electronAPI.updateFlaggedTrusted({ ip, status: newStatus, logFile, reason });

            //refresh table
            updateFlaggedTable();
        });
    });

    //history toggle buttons
    document.querySelectorAll(".toggle-history-btn").forEach(button => {
        button.addEventListener("click", function () {
            const ip = this.getAttribute("data-ip");
            const row = document.getElementById(`history-${ip}`);
            if (row.style.display === "none") {
                row.style.display = "table-row";
                this.textContent = "Hide History ▲";
            } else {
                row.style.display = "none";
                this.textContent = "Show History ▼";
            }
        });
    });
}

function generateHistoryTable(history) {
    if (!history || history.length === 0) {
        return `<div style="text-align:center;">No history found.</div>`;
    }

    let historyHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Reason</th>
                    <th>Log File</th>
                </tr>
            </thead>
            <tbody>
                ${
                    history.map(entry => {
                        const date = new Date(entry.timestamp * 1000).toISOString();
                        return `
                            <tr>
                                <td>${date}</td>
                                <td>${entry.reason}</td>
                                <td>${entry.log_file}</td>
                            </tr>
                        `;
                    }).join("")
                }
            </tbody>
        </table>
    `;
    return historyHTML;
}

//refresh button event listener 
export async function initFlaggedTableEvents() {
    document.addEventListener("click", async function (event) {
        if (!event.target.matches(`#refresh-flagged-data-${currentMode}`)) return;
            await updateFlaggedTable();
    });
};
