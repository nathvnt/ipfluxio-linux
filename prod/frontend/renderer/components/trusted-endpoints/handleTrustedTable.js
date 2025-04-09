import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";

export async function updateTrustedTable() {
    const trustedData = await window.electronAPI.getTrustedData();
    const tableContainer = elements[`trusted-endpoints-table-wrapper-${currentMode}`];

    if (!tableContainer) {
        console.error(`Table container not found: trusted-endpoints-table-${currentMode}`);
        return;
    }

    //check currently_trusted status
    const activeTrustedEntries = Object.keys(trustedData)
        .filter(ip => trustedData[ip].currently_trusted) 
        .reduce((obj, key) => {
            obj[key] = trustedData[key];
            return obj;
        }, {});

    let tableHTML = `
        <table id="trusted-table-${currentMode}" class="table trusted-table">
            <thead>
                <tr>
                    <th>IP Address</th>
                    <th>First Time Trusted</th>
                    <th>Last Time Trusted</th>
                    <th>History</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${
                    Object.keys(activeTrustedEntries).length > 0
                        ? Object.keys(activeTrustedEntries).map(ip => {
                              const data = activeTrustedEntries[ip];
                              return `
                                <tr>
                                    <td class="ip">${data.ip}</td>
                                    <td>${data.first_trusted}</td>
                                    <td>${data.last_trusted}</td>
                                    <td>
                                        <div class="toggle-history-btn config-item" data-ip="${ip}">Show History ▼</div>
                                    </td>
                                    <td>
                                        <select class="trusted-action-dropdown config-item" data-ip="${ip}">
                                            <option value="flagged">Flag</option>
                                            <option value="trusted" selected>Trust</option>
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
                    : `<tr><td colspan="9" style="text-align:center;">No actively trusted endpoints found.</td></tr>`
                }
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;

    //dropdown 'actions' event listeners
    document.querySelectorAll(".trusted-action-dropdown").forEach(dropdown => {
        dropdown.addEventListener("change", async function () {
            const ip = this.getAttribute("data-ip");
            const newStatus = this.value;
            //console.log(`Updating status for ${ip} to ${newStatus}`);
            const data = activeTrustedEntries[ip];
            const logFile = data.last_trusted_log || "unknown.log";
            const reason = `Manually updated to ${newStatus}`;

            //update trusted dictionary
            await window.electronAPI.updateFlaggedTrusted({ ip, status: newStatus, logFile, reason });

            //refresh table
            updateTrustedTable();
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
export async function initTrustedTableEvents() {
    document.addEventListener("click", async function (event) {
        if (!event.target.matches(`#refresh-trusted-data-${currentMode}`)) return;
            await updateTrustedTable();
    });
};
