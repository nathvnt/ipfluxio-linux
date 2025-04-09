export async function loadTrafficTable(mode) {
    const tableHTML = `
        <div id="table-config-menu-${mode}" class="sub-bg p-5 sub-bord">
            <span class="menu-title">Table Configuration</span>
            <div id="table-config-${mode}" class="flex g-30 p-5">

                <div id="log-controls-${mode}">
                    <label for="log-select-${mode}">Load Log File:</label>
                    <select id="log-select-${mode}" class="config-item">
                        <option value="">Select a log file...</option>
                    </select>
                    <button id="load-log-btn-${mode}" class="config-btn teal-btn">Load</button>
                </div>

                <div id="column-controls-wrap-${mode}" class="dropdown-wrap">
                    <span>Toggle Columns:</span>
                    <div id="column-controls-${mode}" class="dropdown-controls">
                        <div id="column-toggle-${mode}" class="config-item dropdown-toggle">Visible Columns <span>▼</span></div>
                        <div id="column-dropdown-${mode}" class="dropdown-content">
                            <label><input type="checkbox" value="inbound" checked> Inbound Packets</label>
                            <label><input type="checkbox" value="outbound" checked> Outbound Packets</label>
                            <label><input type="checkbox" value="out_in_ratio"> Out/IN Ratio</label>
                            <label><input type="checkbox" value="avg_inbound_per_second">Avg Inbound PPS</label>
                            <label><input type="checkbox" value="avg_outbound_per_second">Avg Outbound PPS</label>

                            <label><input type="checkbox" value="largest_packet">Largest Packet</label>
                            <label><input type="checkbox" value="avg_size" checked> Avg Packet Size</label>
                            <label><input type="checkbox" value="bytes_sent"> Total Bytes Sent</label>
                            <label><input type="checkbox" value="bytes_received"> Total Bytes Received</label>
                            <label><input type="checkbox" value="avg_outbound_bps" checked>Avg Bps Out</label>
                            <label><input type="checkbox" value="avg_inbound_bps" checked>Avg Bps In</label>

                            <label><input type="checkbox" value="port_numbers" checked>Port Numbers</label>
                            <label><input type="checkbox" value="protocols" checked> Protocols</label>
                            <label><input type="checkbox" value="processes" checked> Processes</label>
                            <label><input type="checkbox" value="lat_long" checked> Lat/Long</label>

                            <label><input type="checkbox" value="avg_iat" checked> Avg IAT </label>
                            <label><input type="checkbox" value="max_iat">Max IAT</label>
                            <label><input type="checkbox" value="avg_ttl"> Avg TTL</label>
                            <label><input type="checkbox" value="max_ttl"> Max TTL</label>
                            <label><input type="checkbox" value="syn_count"> SYN Count</label>
                            <label><input type="checkbox" value="rst_count"> RST Count</label>

                        </div>
                    </div>
                </div>

                <div id="sorting-controls-${mode}">
                    <label for="sort-select-${mode}">Sort by:</label>
                    <select id="sort-select-${mode}" class="config-item">
                        <option value="ip">IP Address</option>
                        <option value="inbound">Inbound Packets</option>
                        <option value="outbound">Outbound Packets</option>
                        <option value="avg_size">Avg Packet Size</option>
                        <option value="bytes_sent">Total Bytes Sent</option>
                        <option value="bytes_received">Total Bytes Received</option>
                    </select>
                    <button id="sort-asc-${mode}" class="config-btn teal-btn">Ascending</button>
                    <button id="sort-desc-${mode}" class="config-btn teal-btn">Descending</button>
                </div>
            </div>

            <div id="filter-controls-${mode}" class="flex g-15 p-5">

                <div id="filter-controls-wrap-${mode}" class="dropdown-wrap">
                    <span>Active Filters:</span>
                    <div id="active-filters-${mode}" class="dropdown-controls">
                        <div id="toggle-filters-${mode}" class="config-item dropdown-toggle">Active Filters <span>▼</span></div>
                        <div id="filter-dropdown-${mode}" class="dropdown-content"></div>
                    </div>
                </div>

                <div>
                    <label for="filter-column-${mode}">Add Filter:</label>
                    <select id="filter-column-${mode}" class="config-item">
                        <option value="">Filter By...</option>
                        <option value="inbound">Inbound Packets</option>
                        <option value="outbound">Outbound Packets</option>
                        <option value="avg_size">Avg Packet Size</option>
                        <option value="bytes_sent">Total Bytes Sent</option>
                        <option value="bytes_received">Total Bytes Received</option>
                        <option value="avg_iat">Avg Interarrival Time (s)</option>
                        <option value="syn_count">SYN Count</option>
                        <option value="rst_count">RST Count</option>
                        <option value="out_in_ratio">Outbound/Inbound Ratio</option>
                        <option value="avg_ttl">Avg TTL</option>
                        <option value="protocols">Protocols</option>
                        <option value="processes">Processes</option>
                        <option value="location">Lat/Long</option>
                    </select>
                </div>

                <div id="filter-options-${mode}"></div>

                <button id="add-filter-btn-${mode}" class="config-btn teal-btn">Apply</button>
                <button id="clear-filters-btn-${mode}" class="config-btn teal-btn">Clear All</button>

                <div id="row-selectors-${mode}" class="row-selectors">
                    <label>
                        <input type="checkbox" id="select-all-${mode}">
                        Select All
                    </label>
                    <label>
                        <input type="checkbox" id="select-five-${mode}">
                        Select Top 5
                    </label>
                </div>
            </div>

        </div>
        <div id="traffic-log-${mode}" class="sub-bg p-5 sub-bord mt-10 over-x"></div>
       `;
    // document.getElementById(`dynamic-${mode}-bottom`).innerHTML = tableHTML;
    document.getElementById(`traffic-log-container-${mode}`).innerHTML = tableHTML;

}
