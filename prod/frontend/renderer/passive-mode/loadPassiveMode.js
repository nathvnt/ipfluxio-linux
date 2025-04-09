import setupListeners from "../setupListeners.js"; 
import { elements } from "../active-mode/loadActiveMode.js"; 
import { currentMode, setActiveButton } from "../index.js";
import { initVertResizer } from "../components/resizers/verticalResizer.js";
import { initializeTimingGrid } from "./timingWindowGrid.js";
import { handleBaselineConfig } from "./handleBaselineConfig.js";
import { setupStartBaselineHandler } from "./startBaselineHandler.js";
import { loadTrafficMap } from "../components/traffic-map/loadTrafficMap.js"; 
import { loadTrafficGraph } from "../components/traffic-graph/loadTrafficGraph.js"; 
import { loadEndpointInpsector } from "../components/endpoint-inspector/loadEndpointInspector.js"; 
import { loadTrafficTable } from "../components/traffic-table/loadTrafficTable.js"; 
import { loadFlaggedTable } from "../components/flagged-endpoints/loadFlaggedTable.js"; 
import { loadTrustedTable } from "../components/trusted-endpoints/loadTrustedTable.js"; 
import { initTrafficMapEvents } from "../components/traffic-map/handleMap.js"; 
import { initTrafficGraphEvents } from "../components/traffic-graph/generateGraph.js";
import { initEndpointInspectorEvents } from "../components/endpoint-inspector/handleEndpointInspector.js";
import { initTrafficTableEvents, updateDisplay, fetchLogFiles } from "../components/traffic-table/displayTable.js"
import { initFlaggedTableEvents, updateFlaggedTable } from "../components/flagged-endpoints/handleFlaggedTable.js";
import { initTrustedTableEvents, updateTrustedTable } from "../components/trusted-endpoints/handleTrustedTable.js";
import { loadScanSchedule } from "../components/scan-schedule/loadSchedule.js";
import { initScanSchedule } from "../components/scan-schedule/handleSchedule.js";
import { loadEventLog } from "../components/event-log/loadEventLog.js";
import { initEventLog } from "../components/event-log/handleEventLog.js";
import { loadMarquee } from "../components/scan-marquee/loadMarquee.js";
import { initScanMarquee } from "../components/scan-marquee/handleMarquee.js";

export default async function loadPassiveMode() {

    document.getElementById("dynamic-passive-buttons").innerHTML = `
        <div id="middle-btns-${currentMode}" class="middle-buttons button-group main-menu">
            <button id="configure-scan-btn-${currentMode}" class="active-mode stone-btn">Configure Scan</button>
            <button id="show-map-btn-${currentMode}" class="inactive-mode stone-btn">Traffic Map</button>
            <button id="show-graph-btn-${currentMode}" class="inactive-mode stone-btn">Create Graph</button>
            <button id="inspect-endpoint-btn-${currentMode}" class="inactive-mode stone-btn">Inspect Endpoint</button>  
        </div>
        <div id="event-log-wrapper-${currentMode}" class="event-log-wrapper"></div>
        <div id="schedule-wrapper-${currentMode}" class="schedule-wrapper"></div>
    `;

    document.getElementById("dynamic-passive-top").innerHTML = `
        <div id="scan-config-menu-${currentMode}" class="fade-in container sub-con" style="display: flex;">
            <span class="menu-title">Baseline Scan Configuration</span>
            <div class="flex g-15 v-center ml-10">
            
                <div class="row-selectors">
                    <label><input type="checkbox" id="new-baseline-${currentMode}" checked>New Baseline</label>
                    <label><input type="checkbox" id="add-to-existing-${currentMode}">Add to Existing</label>
                </div>

                <select id="select-baseline-${currentMode}" class="config-item">
                    <option value="">Select Baseline</option>
                </select>

                <div>
                    <label for="network-interface-${currentMode}">Interface:</label>
                    <select id="network-interface-${currentMode}" class="config-item">
                        <option value="">Loading...</option>
                    </select>
                </div>

                <div>
                    <button id="start-scan-${currentMode}" class="animate-button start-scan teal-btn no-bord">Start Scan</button>
                    <button id="stop-scan-${currentMode}" disabled class="animate-button stop-scan stone-btn no-bord">Stop Scan</button>
                </div>
            </div>

            <fieldset>
                <legend>Scan Timing & Permissions:</legend>
                <div class="flex flex-start space w-100">
                    <div class="flex flex-col g-8 p-10 w-40">
                        <div class="flex g-15 v-center ml-10 row-selectors">
                            <label><input type="checkbox" id="background-scan-${currentMode}" >Run in Background</label>
                            <label><input type="checkbox" id="set-timing-window-${currentMode}" checked>Set Timing Windows</label>
                        </div>
                        <div class="flex g-15 v-center ml-10">
                            <label>Start:<input type="datetime-local" id="scan-start-${currentMode}" class="config-item"></label>
                            <label>End:<input type="datetime-local" id="scan-end-${currentMode}" class="config-item"></label>
                        </div>
                        <div id="time-window-container">
                            <div id="time-window-${currentMode}"></div>
                        </div>
                    </div>

                    <div class="flex center w-60">
                        <div class="flex center p-10">
                            <div id="timing-grid-${currentMode}"></div>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div class="flex g-15 v-center ml-10">
                <fieldset>
                    <legend>Traffic Direction:</legend>
                        <div class="g-15 v-center flex my-10 p-5">
                            <label><input type="radio" name="traffic-direction-${currentMode}" value="bi-directional" checked> Bi-Directional</label>
                            <label><input type="radio" name="traffic-direction-${currentMode}" value="inbound"> Inbound</label>
                            <label><input type="radio" name="traffic-direction-${currentMode}" value="outbound"> Outbound</label>
                        </div>
                </fieldset>

                <fieldset>
                    <legend>Filter Protocols:</legend>
                        <div class="g-15 v-center flex my-10 p-5">
                            <label><input type="radio" name="protocolGroupPassive" id="select-all-protocol-${currentMode}" checked> All</label>
                            <label><input type="checkbox" class="protocol-${currentMode}" value="TCP"> TCP</label>
                            <label><input type="checkbox" class="protocol-${currentMode}" value="UDP"> UDP</label>
                            <label><input type="checkbox" class="protocol-${currentMode}" value="ICMP"> ICMP</label>
                            <label><input type="checkbox" class="protocol-${currentMode}" value="HTTP"> HTTP</label>
                            <label><input type="checkbox" class="protocol-${currentMode}" value="HTTPS"> HTTPS</label>
                        </div>
                </fieldset>

                <div class="row-selectors">
                    <label>Aggregation Interval (s)<input type="number" value="20" id="agg-interval-${currentMode}" class="config-item ml-10 max-w-100"></label> 
                    <label><input type="checkbox" id="exclude-private-${currentMode}" checked>Exclude Private IPs</label>
                </div>
                
            </div>
        </div>

        <div id="map-container-${currentMode}" class="fade-in container flex-g flex-col" style="display: none;"></div>
        <div id="inspection-container-${currentMode}" class="fade-in container flex-g flex-col center" style="display: none;"></div>

        <div id="top-left-${currentMode}" class="top-left fade-in" style="display: none;">
            <div id="graph-config-menu-${currentMode}" class="container sub-con"></div>
        </div>
        
        <div id="top-right-wrapper-${currentMode}" class="top-right-wrapper fade-in" style="display: none;">

            <!--TOP RIGHT PANEL RESIZER-->
            <div id="vertical-resizer-${currentMode}" class="vertical-resizer">
                <div class="vertical-resizer-handle-wrapper">
                    <div id="vertical-resizer-handle-${currentMode}" class="vertical-resizer-handle"></div>
                </div>
            </div>

            <div id="top-right-${currentMode}" class="top-right">
                <div id="graph-container-${currentMode}" class="fade-in container flex-g flex-col center"></div>
            </div>
        </div>
    `;

    document.getElementById("dynamic-passive-bottom").innerHTML = `
        <div class="table-buttons-wrapper inner-bg">
            <div id="table-display-buttons-${currentMode}" class="table-display-buttons fade-in">
                <button id="show-traffic-table-${currentMode}" class="active-mode stone-btn">Traffic Table</button>
                <button id="show-flagged-${currentMode}" class="inactive-mode stone-btn">Flagged Endpoints</button>
                <button id="show-trusted-${currentMode}" class="inactive-mode stone-btn">Trusted Endpoints</button>  
            </div>

            <div id="scan-marquee-${currentMode}" class="scan-marquee"></div>
        </div>

        <div id="traffic-log-container-${currentMode}" class="fade-in"></div>
        <div id="flagged-endpoints-container-${currentMode}" class="fade-in" style="display: none;"></div>
        <div id="trusted-endpoints-container-${currentMode}" class="fade-in" style="display: none;"></div>
    `;

    //inject compoents html
    loadScanSchedule(currentMode);
    loadEventLog(currentMode);
    loadMarquee(currentMode);
    loadTrafficMap(currentMode);
    loadTrafficGraph(currentMode);
    loadEndpointInpsector(currentMode);
    loadTrafficTable(currentMode);
    loadFlaggedTable(currentMode);
    loadTrustedTable(currentMode);

    //generate and update all DOM elements after rendering html 
    Object.assign(elements, await setupListeners("passive", elements));
    //console.log("Passive Mode Elements Loaded:", elements);

    //initialize component event listers
    initVertResizer();
    initScanSchedule();
    initEventLog();
    initScanMarquee();
    initTrafficMapEvents();
    initTrafficGraphEvents();
    initEndpointInspectorEvents();
    initTrafficTableEvents();
    initFlaggedTableEvents();
    initTrustedTableEvents();

    initializeTimingGrid(currentMode);
    updateDisplay(); //render intial empty traffic table 
    handleBaselineConfig(); //initialize Scan Config Listeners
    setupStartBaselineHandler(); //initialize Start Scan Handler
    fetchLogFiles(); //fill log select drop down

    //attach gui to scan if one was running in background on startup
    window.electronAPI.attachLiveScan()
        .then((response) => {
        if (response.success) { 
            window.electronAPI.logEvent(`[ATTACHED TO EXISTING LIVE SCAN (PID: ${response.pid})]`);
            //console.log(`Live passive scan running. PID: ${response.pid}`);
            // Enable stop scan button
            elements[`stop-scan-${currentMode}`].disabled = false;
        } else {
            //console.log("No passive scan currently running.");
        }
        })
        .catch(err => console.error(err));
    
  
    //switch between scan config, map, & graph display 
    elements[`configure-scan-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "flex";
        elements[`top-left-${currentMode}`].style.display = "none";
        elements[`top-right-wrapper-${currentMode}`].style.display = "none";
        elements[`inspection-container-${currentMode}`].style.display = "none";
        elements[`map-container-${currentMode}`].style.display = "none";
        elements[`refresh-map-btn-${currentMode}`].style.display = "none";
    });

    elements[`show-map-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "none";
        elements[`top-left-${currentMode}`].style.display = "none";
        elements[`top-right-wrapper-${currentMode}`].style.display = "none";
        elements[`inspection-container-${currentMode}`].style.display = "none";
        elements[`map-container-${currentMode}`].style.display = "flex";
        elements[`refresh-map-btn-${currentMode}`].style.display = "block";
    }); 

    elements[`show-graph-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "none";
        elements[`top-left-${currentMode}`].style.display = "flex";
        elements[`top-right-wrapper-${currentMode}`].style.display = "flex";
        elements[`inspection-container-${currentMode}`].style.display = "none";
        elements[`map-container-${currentMode}`].style.display = "none";
        elements[`refresh-map-btn-${currentMode}`].style.display = "none";
    }); 

    elements[`inspect-endpoint-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "none";
        elements[`top-left-${currentMode}`].style.display = "none";
        elements[`top-right-wrapper-${currentMode}`].style.display = "none";
        elements[`inspection-container-${currentMode}`].style.display = "flex";
        elements[`map-container-${currentMode}`].style.display = "none";
        elements[`refresh-map-btn-${currentMode}`].style.display = "none";
    }); 


    //toggle bottom table displays 
    elements[`show-traffic-table-${currentMode}`].addEventListener("click", () => {
        elements[`traffic-log-container-${currentMode}`].style.display = "block";
        elements[`flagged-endpoints-container-${currentMode}`].style.display = "none";
        elements[`trusted-endpoints-container-${currentMode}`].style.display = "none";
        updateDisplay(); 
    });

    elements[`show-flagged-${currentMode}`].addEventListener("click", () => {
        elements[`traffic-log-container-${currentMode}`].style.display = "none";
        elements[`flagged-endpoints-container-${currentMode}`].style.display = "block";
        elements[`trusted-endpoints-container-${currentMode}`].style.display = "none";
        updateFlaggedTable();
    });

    elements[`show-trusted-${currentMode}`].addEventListener("click", () => {
        elements[`traffic-log-container-${currentMode}`].style.display = "none";
        elements[`flagged-endpoints-container-${currentMode}`].style.display = "none";
        elements[`trusted-endpoints-container-${currentMode}`].style.display = "block";
        updateTrustedTable();
    });
    

    //event Listeners for Middle Button Group
    elements[`middle-btns-${currentMode}`].addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            setActiveButton(`middle-btns-${currentMode}`, event.target.id, "id");
        }
    });

    // Event Listeners for Table Display Buttons
    elements[`table-display-buttons-${currentMode}`].addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            setActiveButton(`table-display-buttons-${currentMode}`, event.target.id, "id");
        }
    });
};
