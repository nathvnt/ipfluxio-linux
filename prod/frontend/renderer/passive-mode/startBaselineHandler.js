import { currentMode } from "../index.js";
import { elements } from "../active-mode/loadActiveMode.js";
import { updateTimeWindow } from "./timingWindowGrid.js" 

export async function setupStartBaselineHandler() {

    elements["start-scan-passive"].addEventListener("click", () => {
        const startTime = elements["scan-start-passive"].value || null;
        const endTime = elements["scan-end-passive"].value || null;

        let aggInterval = parseFloat(elements["agg-interval-passive"].value);

        if (isNaN(aggInterval) || aggInterval < 5) {
            aggInterval = 5; 
        }

        const excludePrivate = elements["exclude-private-passive"].checked;
        const allSelected = elements["select-all-protocol-passive"].checked;
        const selectedInterface = elements["network-interface-passive"].value;

        let selectedProtocols = allSelected 
            ? ["TCP", "UDP", "ICMP", "HTTP", "HTTPS"]
            : [...document.querySelectorAll(".protocol-passive:checked")].map(el => el.value);

        const trafficDirectionElement = document.querySelector("input[name='traffic-direction-passive']:checked");
        const trafficDirection = trafficDirectionElement ? trafficDirectionElement.value : "bi-directional";

        const newBaseline = elements["new-baseline-passive"].checked;
        const addToExisting = elements["add-to-existing-passive"].checked;
        const selectBaseline = elements["select-baseline-passive"].value;
        const backgroundScan = elements["background-scan-passive"].checked;
        const setTimingWindow = elements["set-timing-window-passive"].checked;

        let timeWindows = setTimingWindow ? updateTimeWindow(currentMode) : "24x7";
        const insideTimingWindow = setTimingWindow ? isInsideTimingWindow(timeWindows) : true;

        const scanConfig = {
            scanType: "passive",
            start: startTime,
            end: endTime,
            aggInterval,
            excludePrivate,
            protocols: selectedProtocols,
            trafficDirection,
            networkInterface: selectedInterface,
            newBaseline,
            addToExisting,
            selectBaseline,
            backgroundScan,
            setTimingWindow,
            insideTimingWindow,
            timing: timeWindows
        };
        window.electronAPI.send("start-passive-scan", scanConfig);
        
        elements["start-scan-passive"].disabled = true;
        elements["stop-scan-passive"].disabled = false;
    });

    elements["stop-scan-passive"].addEventListener("click", () => {
        window.electronAPI.send("stop-scan", currentMode);

        elements["stop-scan-passive"].disabled = true;
        elements["start-scan-passive"].disabled = false;
    });
}


function isInsideTimingWindow(timingConfig) {
    const now = new Date();
    const dayOfWeek = now.toLocaleString("en-US", { weekday: "short" });

    const todaysWindows = timingConfig?.[dayOfWeek] || [];
    if (!todaysWindows.length || todaysWindows.includes("No time selected")) {
        return false;
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const range of todaysWindows) {
        const [startStr, endStr] = range.split(" - ");
        if (!startStr || !endStr) continue;

        const [startH, startM] = startStr.trim().split(":").map(Number);
        let [endH, endM] = endStr.trim() === "24:00"
            ? [0, 0]  // next day rollover
            : endStr.trim().split(":").map(Number);

        const startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        //handle 24:00 
        if (endStr.trim() === "24:00" || endMinutes <= startMinutes) {
            if (nowMinutes >= startMinutes || nowMinutes < endMinutes) {
                return true;
            }
        } else {
            if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
                return true;
            }
        }
    }
    return false;
}
