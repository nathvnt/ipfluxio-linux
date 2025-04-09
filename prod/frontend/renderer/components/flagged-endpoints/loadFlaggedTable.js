export async function loadFlaggedTable(mode) {
    const tableHTML = `
        <div class="text-left sub-bg table-border no-bord-b p-5">
            <table>
                <thead>
                    <tr>
                        <th>
                            Flagged Endpoints
                            <button id="refresh-flagged-data-${mode}" class="config-btn stone-btn">Refresh Data</button>
                        </th>
                    </tr>
                </thead>
            </table>
        </div>

        <div id="flagged-endpoints-table-wrapper-${mode}" class="over-x over-y sub-bg"></div>
    `;
    document.getElementById(`flagged-endpoints-container-${mode}`).innerHTML = tableHTML;
}
