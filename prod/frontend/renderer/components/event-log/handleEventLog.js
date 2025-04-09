import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";

let unseenEventCount = 0;
let latestLogEntries = [];

export async function initEventLog() {

    window.electronAPI.onUpdateEventLog((event, updatedLog) => {
        const previousLength = latestLogEntries.length;
        const newLength = updatedLog.length;
        const delta = Math.max(newLength - previousLength, 0);

        if (delta > 0) {
            unseenEventCount += delta;
        }

        latestLogEntries = updatedLog;
        updateEventLogDisplay(latestLogEntries);
    });


    function updateEventLogDisplay(logEntries) {
        const logContainers = document.querySelectorAll('.event-log-content');
        const toggleContainers = document.querySelectorAll('.event-log-toggle');

        logContainers.forEach((container, index) => {
            container.innerHTML = '';

            logEntries.forEach(entry => {
                const logLine = document.createElement('div');
                logLine.classList.add('event-log-line');
                logLine.textContent = entry;
                container.appendChild(logLine);
            });

            container.scrollTop = container.scrollHeight;

            if (!container.classList.contains("show") && unseenEventCount > 0) {
                toggleContainers[index].classList.add("new-event");
                const newEventSpan = toggleContainers[index].querySelector('.new-event-count');
                if (newEventSpan) {
                    newEventSpan.textContent = `(${unseenEventCount} New)`;
                }
            }
        });
    }

    const eventLogToggle = elements[`event-log-toggle-${currentMode}`];
    const eventLogDropdown = elements[`event-log-dropdown-${currentMode}`];

    if (eventLogToggle && eventLogDropdown) {
        eventLogToggle.addEventListener("click", () => {
            eventLogDropdown.classList.toggle("show");

            if (eventLogDropdown.classList.contains("show")) {
                unseenEventCount = 0;
                const toggleContainers = document.querySelectorAll('.event-log-toggle');

                toggleContainers.forEach((btn) => {
                    btn.classList.remove("new-event");
        
                    const newEventSpan = btn.querySelector('.new-event-count');
                    if (newEventSpan) {
                        newEventSpan.textContent = ''; 
                    }
                });
            }
        });

        document.addEventListener("click", (event) => {
            if (!eventLogToggle.contains(event.target) && !eventLogDropdown.contains(event.target)) {
                eventLogDropdown.classList.remove("show");
            }
        });
    }
}
