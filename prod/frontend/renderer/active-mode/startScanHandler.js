import { currentMode } from "../index.js";
import { elements } from "../active-mode/loadActiveMode.js";

export async function setupStartScanHandler() {

    elements[`start-scan-${currentMode}`].addEventListener("click", () => {
        const startTime = elements[`scan-start-${currentMode}`].value || null;
        const endTime = elements[`scan-end-${currentMode}`].value || null;

        let aggInterval = parseFloat(elements[`agg-interval-${currentMode}`].value);

        if (isNaN(aggInterval) || aggInterval < 5) {
            aggInterval = 5; 
        }

        const excludePrivate = elements[`exclude-private-${currentMode}`].checked;
        const allSelected = elements[`select-all-protocol-${currentMode}`].checked;
        const selectedInterface = elements[`network-interface-${currentMode}`].value;
        
        let selectedProtocols = allSelected 
            ? ["TCP", "UDP", "ICMP", "HTTP", "HTTPS"]
            : [...document.querySelectorAll(".protocol-active:checked")].map(el => el.value);
            
        const trafficDirectionElement = document.querySelector("input[name='traffic-direction-active']:checked");
        const trafficDirection = trafficDirectionElement ? trafficDirectionElement.value : "bi-directional"; 
        
        const scanConfig = {
            scanType: "active",
            start: startTime,
            end: endTime,
            excludePrivate,
            aggInterval,
            protocols: selectedProtocols,
            trafficDirection,
            networkInterface: selectedInterface 
        };

        window.electronAPI.send("start-active-scan", scanConfig);

        elements[`start-scan-${currentMode}`].disabled = true;
        elements[`stop-scan-${currentMode}`].disabled = false;
    });

    elements[`stop-scan-${currentMode}`].addEventListener("click", () => {
        window.electronAPI.send("stop-scan", currentMode);

        elements[`stop-scan-${currentMode}`].disabled = true;
        elements[`start-scan-${currentMode}`].disabled = false;
    });
}
