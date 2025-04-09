import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";

//init event listeners 
export async function initTrafficMapEvents() {

    //listen for auto map refresh requests from `main.js`
    window.electronAPI.receive("refresh-map", () => {
        elements[`traffic-map-${currentMode}`].contentWindow.location.reload();
    });

    //refresh button event listener (can update map type)
    if (elements[`refresh-map-btn-${currentMode}`]) {
        elements[`refresh-map-btn-${currentMode}`].addEventListener("click", () => {
            const selectedMapType = document.querySelector(`#map-menu-${currentMode} input[name="map-type"]:checked`).value;
            window.electronAPI.send("refresh-manual", selectedMapType); 
            window.electronAPI.logEvent(`[${selectedMapType} MAP REFRESHED]`);
        });
    } else {
        console.warn("Could not find refresh-map-btn element.");
    }

    //make map type checkboxes mutually exclusive
    document.querySelectorAll(`#map-menu-${currentMode} input[name="map-type"]`).forEach(box => {
        box.addEventListener('change', () => {
            document.querySelectorAll(`#map-menu-${currentMode} input[name="map-type"]`).forEach(otherBox => {
                if (otherBox !== box) otherBox.checked = false;
            });
        });
    });
    
};