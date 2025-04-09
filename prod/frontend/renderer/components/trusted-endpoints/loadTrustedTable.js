export async function loadTrustedTable(mode) {
    const tableHTML = `
        <div class="text-left sub-bg table-border no-bord-b p-5">
            <table>
                <thead>
                    <tr>
                        <th>
                            Trusted Endpoints
                            <button id="refresh-trusted-data-${mode}" class="config-btn stone-btn">Refresh Data</button>
                        </th>
                    </tr>
                </thead>
            </table>
        </div>

        <div id="trusted-endpoints-table-wrapper-${mode}" class="over-x over-y sub-bg"></div>
    `;
    document.getElementById(`trusted-endpoints-container-${mode}`).innerHTML = tableHTML;
}