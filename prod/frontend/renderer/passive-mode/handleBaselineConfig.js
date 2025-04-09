import { elements } from "../active-mode/loadActiveMode.js";

//populate network interfaces
async function getNetworkInterfaces() {
    try {
        const interfaces = await window.electronAPI.invoke("get-network-interfaces");

        //console.log("FOUND INTERFACES:", interfaces);

        if (!Array.isArray(interfaces)) {
            throw new Error("Received an invalid response for network interfaces.");
        }

        elements["network-interface-passive"].innerHTML = interfaces.length > 0
            ? interfaces.map(iface => `<option value="${iface}">${iface}</option>`).join("")
            : '<option value="">No interfaces found</option>';
    } catch (error) {
        console.error("Error fetching network interfaces:", error);
    }
}

//fetch and populate existing baseline logs
async function fetchBaselineLogs() {
    const selectBaselineDropdown = elements["select-baseline-passive"];
    if (!selectBaselineDropdown) return;

    try {
        const logFiles = await window.electronAPI.fetchLogFiles("passive"); 
        selectBaselineDropdown.innerHTML = `<option value="">Select Baseline</option>`; 

        if (logFiles.length > 0) {
            logFiles.forEach((filename) => {
                let option = document.createElement("option");
                option.value = filename;
                option.textContent = filename;
                selectBaselineDropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to fetch baseline logs:", error);
    }
}

export async function handleBaselineConfig() {

    const {
        "start-scan-passive": startScanButton,
        "scan-end-passive": endInput,
        "scan-start-passive": startInput,
        "network-interface-passive": networkInterface,
        "select-all-protocol-passive": selectAll,
        "exclude-private-passive": excludePrivate,
        "new-baseline-passive": newBaseline,
        "add-to-existing-passive": addToExisting,
        "select-baseline-passive": selectBaseline,
        "background-scan-passive": backgroundScan,
        "set-timing-window-passive": setTimingWindow
    } = elements;

    const protocolCheckboxes = document.querySelectorAll(".protocol-passive");

    if (!endInput || !startScanButton || !selectAll || !excludePrivate || !networkInterface || !newBaseline || !addToExisting || !selectBaseline) return;

    //default scan start time to current time
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

    //protocol selection behavior
    protocolCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectAll.checked = false;
            }
            if (![...protocolCheckboxes].some(c => c.checked)) {
                selectAll.checked = true;
            }
        });
    });

    selectAll.addEventListener("change", () => {
        if (selectAll.checked) {
            protocolCheckboxes.forEach(checkbox => (checkbox.checked = false));
        }
    });

    //exclude Private IPs toggle
    excludePrivate.addEventListener("change", () => {
        //console.log(`Exclude Private IPs: ${excludePrivate.checked ? "ON" : "OFF"}`);
    });

    //new baseline vs add to existing toggle logic
    function toggleBaselineOptions(event) {
        if (event.target === newBaseline && newBaseline.checked) {
            addToExisting.checked = false;
            selectBaseline.disabled = true;
        } else if (event.target === addToExisting && addToExisting.checked) {
            newBaseline.checked = false;
            selectBaseline.disabled = false;
        }
    }

    //set initial state
    newBaseline.checked = true;
    addToExisting.checked = false;
    selectBaseline.disabled = true;

    //attach event listeners
    newBaseline.addEventListener("change", toggleBaselineOptions);
    addToExisting.addEventListener("change", toggleBaselineOptions);

    //enable or disable baseline selection dropdown when "Add to Existing" is toggled
    elements["add-to-existing-passive"].addEventListener("change", async (event) => {
        const selectBaselineDropdown = elements["select-baseline-passive"];
        const newBaselineCheckbox = elements["new-baseline-passive"];

        if (event.target.checked) {
            selectBaselineDropdown.disabled = false;
            newBaselineCheckbox.checked = false; 
            await fetchBaselineLogs(); 
        } else {
            selectBaselineDropdown.disabled = true;
            newBaselineCheckbox.checked = true; 
        }
    });

    //fetch and populate network interfaces
    getNetworkInterfaces();
    validateScanConfig();
}
