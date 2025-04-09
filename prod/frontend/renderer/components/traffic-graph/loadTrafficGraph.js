export async function loadTrafficGraph(mode) {
    const graphConfigHTML = `
        <span class="menu-title">Graph Configuration</span>
        <fieldset>
            <legend>Endpoint Data Scope:</legend>
            <div id="graph-data-scope-${mode}" class="g-15 v-center flex my-10 p-5 text-14 row-selectors">
                <label><input type="checkbox" name="data-scope" value="individual" id="individual-endpoints-${mode}">Individual Endpoint</label>
                <label><input type="checkbox" name="data-scope" value="parallel" id="parallel-endpoints-${mode}">Parallel Endpoints</label>
                <label><input type="checkbox" name="data-scope" value="combined" id="combined-endpoints-${mode}">Combined Endpoints</label>
            </div>
        </fieldset>

        <fieldset>
            <legend>Defined Variables:</legend>
            <div id="data-point-drops-${mode}" class="g-15 v-center flex my-10 p-5 center">
                <div id="data-points-wrap-${mode}" class="dropdown-wrap">   
                    <div id="data-points-${mode}" class="dropdown-controls">
                        <div id="data-point-toggle-${mode}" class="config-item dropdown-toggle">Selected Metrics <span>▼</span></div>
                        <div id="data-point-dropdown-${mode}" class="dropdown-content graph-drop-content">
                            <label><input type="checkbox" value="inbound"> Inbound Packets</label>
                            <label><input type="checkbox" value="outbound"> Outbound Packets</label>
                            <label><input type="checkbox" value="avg_inbound_per_second">Avg Inbound PPS</label>
                            <label><input type="checkbox" value="avg_outbound_per_second">Avg Outbound PPS</label>

                            <label><input type="checkbox" value="avg_size"> Avg Packet Size</label>
                            <label><input type="checkbox" value="bytes_sent"> Total Bytes Sent</label>
                            <label><input type="checkbox" value="bytes_received"> Total Bytes Received</label>
                            <label><input type="checkbox" value="avg_outbound_bps">Avg Outbound Bps</label>
                            <label><input type="checkbox" value="avg_inbound_bps">Avg Inbound Bps</label>

                            <label><input type="checkbox" value="avg_iat"> Avg Interarrival Time (s)</label>
                            <label><input type="checkbox" value="avg_ttl"> Avg TTL</label>            
                        </div>
                    </div>
                </div>
                
                <div id="selected-endpoints-wrap-${mode}" class="dropdown-wrap">   
                    <div id="selected-endpoints-${mode}" class="dropdown-controls">
                        <div id="selected-endpoints-toggle-${mode}" class="config-item dropdown-toggle">Selected Endpoints <span>▼</span></div>
                        <div id="selected-endpoints-dropdown-${mode}" class="dropdown-content graph-drop-content"></div>
                    </div>
                </div>
            </div>
        </fieldset>

        <fieldset>
            <legend>Time Interval:</legend>
            <div class="text-14 g-15 v-center flex my-10 p-5 row-selectors">
                <label><input type="checkbox" id="attach-live-${mode}" class="">Attach to Live Scan</label>
            </div>
            
            <div id=interval-times-${mode} class="text-14 g-15 v-center flex my-10 p-5">
                <div id="interval-dates">
                    <label>
                        Start: 
                        <input type="datetime-local" id="graph-start-${mode}" class="config-item">
                    </label>
                    <label> 
                        End: 
                        <input type="datetime-local" id="graph-end-${mode}" class="config-item">
                    </label>
                </div>
            </div>
        </fieldset>

        <div class="animate-button-wrapper">
            <button id="generate-graph-btn-${mode}" class="animate-button generate-graph-btn teal-btn no-bord">Generate Graph</button>
        </div>
       `;
    document.getElementById(`graph-config-menu-${mode}`).innerHTML = graphConfigHTML;

    const graphDisplayHTML = `
        <div id="graph-display-${mode}" class="container flex-g flex-col center inner-bg">
            <div id="traffic-graph-${mode}" class="w-100 h-100 center flex-g"></div>
        </div>
        `;
    document.getElementById(`graph-container-${mode}`).innerHTML = graphDisplayHTML;
}
