import { currentMode } from "../index.js";
import { elements } from "../active-mode/loadActiveMode.js";

//populate network interfaces
async function getNetworkInterfaces() {
    try {
        const interfaces = await window.electronAPI.invoke("get-network-interfaces"); 
        //console.log("INTERFACE", interfaces)
        if (!Array.isArray(interfaces)) {
            throw new Error("Received an invalid response for network interfaces.");
        }

        elements[`network-interface-active`].innerHTML = interfaces.length > 0
            ? interfaces.map(iface => `<option value="${iface}">${iface}</option>`).join("")
            : '<option value="">No interfaces found</option>';
    } catch (error) {
        console.error("Error fetching network interfaces:", error);
    }
}

export async function handleScanConfig() {

    const { 
        "start-scan-active": startScanButton, 
        "scan-start-active": startInput,
        "scan-end-active": endInput, 
        "network-interface-active": networkInterface,
        "select-all-protocol-active": selectAll,
        "exclude-private-active": excludePrivate
    } = elements;

    const protocolCheckboxes = document.querySelectorAll(".protocol-active");

    if (!endInput || !startScanButton || !selectAll || !excludePrivate ) return; 

    //set default scan start time to current time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    startInput.value = now.toISOString().slice(0, 16);

    function validateScanConfig() {
        const startTime = new Date(startInput.value);
        const endTime = new Date(endInput.value);

        //disable start button if either start or end time is missing, invalid, or end time is before start time
        startScanButton.disabled = isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime;
    }

    //attach listeners for scan timing
    endInput.addEventListener("input", () => {
        validateScanConfig();
    });

    endInput.addEventListener("click", () => {
        validateScanConfig();
    });


    //attach listeners for protocol filtering
    protocolCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectAll.checked = false; 
            }

            //if no checkboxes are checked, revert to "All"
            if (![...protocolCheckboxes].some(c => c.checked)) {
                selectAll.checked = true;
            }
        });
    });

    selectAll.addEventListener("change", () => {
        if (selectAll.checked) {
            protocolCheckboxes.forEach(checkbox => checkbox.checked = false);
        }
    });

    //toggle functionality for Exclude Private IPs
    excludePrivate.addEventListener("change", () => {
        //console.log(`Exclude Private IPs: ${excludePrivate.checked ? "ON" : "OFF"}`);
    });

    //fetch and populate network interfaces
    getNetworkInterfaces();
    validateScanConfig();
}
