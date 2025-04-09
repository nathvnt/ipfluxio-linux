export function generateHistoricalTable(endpointInfo, status = "N/A") {
    return `
        <div class="w-100 flex flex-col g-8">
            <div class="">
                <table class="historical-data-table table">
                    <thead>
                        <tr><th colspan="2">Endpoint Overview</th></tr>
                    </thead>
                </table>
                <div class="flex flex-row">
                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Status</th>
                                <td class="${status === 'Flagged' ? 'status-flagged' : status === 'Trusted' ? 'status-trusted' : 'status-na'}">
                                    ${status}
                                </td>
                            </tr>
                            <tr><th>First Seen</th><td>${endpointInfo.first_seen}</td></tr>
                            <tr><th>Last Seen</th><td>${endpointInfo.last_seen}</td></tr>
                        </tbody>
                    </table>

                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Port Numbers</th>
                                <td>
                                    ${generatePortDropdown(endpointInfo.port_numbers)}
                                </td>
                            </tr>
                            <tr><th>Protocols</th>
                                <td>${Array.isArray(endpointInfo.protocols) ? endpointInfo.protocols.join(", ") : "N/A"}</td>
                            </tr>
                            <tr><th>Processes</th>
                                <td>${Array.isArray(endpointInfo.processes) ? endpointInfo.processes.join(", ") : "N/A"}</td>
                            </tr>
                            <tr><th>Locations</th>
                                <td>${Array.isArray(endpointInfo.location) ? endpointInfo.location.join(", ") : "N/A"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="">
                <table class="historical-data-table table">
                    <thead>
                        <tr><th colspan="2">Packet Count Data</th></tr>
                    </thead>
                </table>
                <div class="flex flex-row">
                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Total Packets </th><td>${endpointInfo.total_packets}</td></tr>
                            <tr><th>Inbound Packets</th><td>${endpointInfo.total_inbound}</td></tr>
                            <tr><th>Outbound Packets</th><td>${endpointInfo.total_outbound}</td></tr>
                            <tr><th>Avg Out/In Ratio</th><td>${endpointInfo.out_in_ratio}</td></tr>
                        </tbody>
                    </table>

                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Avg Inbound PPS</th><td>${endpointInfo.avg_inbound_per_second}</td></tr>
                            <tr><th>Avg Outbound PPS</th><td>${endpointInfo.avg_outbound_per_second}</td></tr>
                            <tr><th>Avg Inbound PPM</th><td>${endpointInfo.avg_inbound_per_minute}</td></tr>
                            <tr><th>Avg Outbound PPM</th><td>${endpointInfo.avg_outbound_per_minute}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="">
                <table class="historical-data-table table">
                    <thead>
                        <tr><th colspan="2">Packet Size Data</th></tr>
                    </thead>
                </table>
                <div class="flex flex-row">
                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Avg Packet Size</th><td>${endpointInfo.avg_size}</td></tr>
                            <tr><th>Largest Packet</th><td>${endpointInfo.largest_packet}</td></tr>
                            <tr><th>Total Bytes Sent</th><td>${endpointInfo.total_bytes_sent}</td></tr>
                            <tr><th>Total Bytes Received</th><td>${endpointInfo.total_bytes_received}</td></tr>
                        </tbody>
                    </table>

                    <table class="historical-data-table table">
                        <tbody>
                            <tr><th>Avg Sent Bps</th><td>${endpointInfo.avg_outbound_bps}</td></tr>
                            <tr><th>Avg Received Bps</th><td>${endpointInfo.avg_inbound_bps}</td></tr>
                            <tr><th>Avg Sent Bpm</th><td>${endpointInfo.avg_outbound_bpm}</td></tr>
                            <tr><th>Avg Received Bpm</th><td>${endpointInfo.avg_inbound_bpm}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="">
                <div class="flex flex-row">
                    <table class="historical-data-table table">
                        <thead>
                            <tr><th colspan="2">Packet IAT Data</th></tr>
                        </thead>
                        <tbody>
                            <tr><th>Avg IAT</th><td>${endpointInfo.avg_iat}</td></tr>
                            <tr><th>Highest IAT</th><td>${endpointInfo.max_iat}</td></tr>
                        </tbody>
                    </table>

                    <table class="historical-data-table table">
                        <thead>
                            <tr><th colspan="2">Packet TTL Data</th></tr>
                        </thead>
                        <tbody>
                            <tr><th>Avg TTL</th><td>${endpointInfo.avg_ttl}</td></tr>
                            <tr><th>Highest TTL</th><td>${endpointInfo.max_ttl}</td></tr>
                        </tbody>
                    </table>

                    <table class="historical-data-table table">
                        <thead>
                            <tr><th colspan="2">SYN & RST Data</th></tr>
                        </thead>
                        <tbody>
                            <tr><th>SYN Count</th><td>${endpointInfo.syn_count}</td></tr>
                            <tr><th>RST Count</th><td>${endpointInfo.rst_count}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export function generatePortDropdown(portNumbers = []) {
    if (!Array.isArray(portNumbers) || portNumbers.length === 0) return "N/A";

    const uniqueID = `port-select-${Math.random().toString(36).substring(2, 10)}`;

    return `
        <select id="${uniqueID}" class="config-item">
            ${portNumbers.map((port, index) => `
                <option value="${port}" ${index === 0 ? "selected" : ""}>${port}</option>
            `).join("")}
        </select>
    `;
}


