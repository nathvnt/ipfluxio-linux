export async function loadScanSchedule(mode) {
    const eventLogHTML = `
        <div id="schedule-container-${mode}" class="scan-schedule">
            <div id="schedule-entries-wrap-${mode}" class="dropdown-wrap">   
                <div id="schedule-entries-${mode}" class="dropdown-controls">
                    <div id="schedule-toggle-${mode}" class="schedule-toggle">Scan Schedule<span>▼</span></div>
                    <div id="schedule-dropdown-${mode}" class="schedule-content">
                        <!-- schedule here -->
                    </div>
                </div>
            </div>
        </div>
       `;
    document.getElementById(`schedule-wrapper-${mode}`).innerHTML = eventLogHTML
}