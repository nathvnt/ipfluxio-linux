export async function loadEndpointInpsector(mode) {
    const endpointInspectionHTML = `
        <div id="endpoint-inspection-wrapper-${mode}" class="container flex-col">
            <div id="selected-endpoint-menu-${mode}" class="flex flex-row h-10 sub-bg p-20 g-15 v-center sub-bord bord-b">
                <div class="endpoint-toggle-wrapper">
                    <div class="endpoint-toggle">
                        <input type="checkbox" id="endpoint-data-toggle-${mode}" class="endpoint-toggle-input">
                        <label for="endpoint-data-toggle-${mode}" class="endpoint-toggle-label"></label>
                    </div>
                </div>
                <div class="endpoint-display">
                    <span class="selected-endpoint-title">Selected Endpoint:</span>
                    <span id="selected-endpoint-${mode}" class="selected-endpoint">No endpoint selected</span>
                </div>
                <div class="endpoint-btns">
                    <button id="refresh-historical-data-${mode}" class="config-btn teal-btn">Refresh Historical Data</button>
                    <button id="refresh-security-data-${mode}" class="config-btn amber-btn" style="display: none;">Run Security Scan</button>
                </div>
            </div>

            <div id="historical-table-container-${mode}" class="sub-bg h-90 over-y"></div>

            <div id="security-table-container-${mode}" class="sub-bg h-90 over-y" style="display: none;"></div>
        </div>

        `;
    document.getElementById(`inspection-container-${mode}`).innerHTML = endpointInspectionHTML;    
};