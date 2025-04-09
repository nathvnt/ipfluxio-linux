export async function loadEventLog(mode) {
    const eventLogHTML = `
        <div id="event-log-container-${mode}" class="event-log">
            <div id="event-log-entries-wrap-${mode}" class="dropdown-wrap">   
                <div id="event-log-entries-${mode}" class="dropdown-controls">
                    <div id="event-log-toggle-${mode}" class="event-log-toggle">
                        <div class="left-group">
                            <span class="event-log-label">Event Log</span>
                            <span class="new-event-count"></span>
                        </div>
                        <span class="event-log-label">▼</span>
                    </div>
                    <div id="event-log-dropdown-${mode}" class="event-log-content">
                        <!-- event log entries here -->
                    </div>
                </div>
            </div>
        </div>
       `;
    document.getElementById(`event-log-wrapper-${mode}`).innerHTML = eventLogHTML
}