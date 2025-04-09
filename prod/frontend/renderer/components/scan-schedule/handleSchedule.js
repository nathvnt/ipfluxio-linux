import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";



export async function initScanSchedule() {
    
    const scheduleToggle = elements[`schedule-toggle-${currentMode}`];
    const scheduleDropdown = elements[`schedule-dropdown-${currentMode}`];

    if (scheduleToggle && scheduleDropdown) {
        scheduleToggle.addEventListener("click", async() => {
            scheduleDropdown.innerHTML = ""; 

            try {
                const scheduleData = await window.electronAPI.getScanSchedule();

                if (Array.isArray(scheduleData) && scheduleData.length > 0) {
                    for (const entry of scheduleData) {
                        const config = entry.config;
                        const startTime = new Date(config.start);
                        const endTime = new Date(config.end);

                        const dateStr = `${String(startTime.getMonth() + 1).padStart(2, "0")}-${String(startTime.getDate()).padStart(2, "0")}`;
                        const timeStr = `${startTime.getHours().toString().padStart(2, "0")}:${startTime.getMinutes().toString().padStart(2, "0")} - ${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

                        const item = document.createElement("div");
                        item.classList.add("scheduled-scan-entry");
                        item.textContent = `${dateStr}, ${timeStr}`;
                        scheduleDropdown.appendChild(item);
                    }
                } else {
                    scheduleDropdown.innerHTML = "<em>No scheduled scans found.</em>";
                }
            } catch (err) {
                console.error("Failed to load scan schedule:", err);
                scheduleDropdown.innerHTML = "<em>Error loading schedule.</em>";
            }

            scheduleDropdown.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!scheduleToggle.contains(event.target) && !scheduleDropdown.contains(event.target)) {
                scheduleDropdown.classList.remove("show");
            }
        });
    }
}
