import setupListeners from "../setupListeners.js"; //sets up all DOM elements  
import { currentMode, setActiveButton } from "../index.js";
import { initVertResizer } from "../components/resizers/verticalResizer.js";
import { initHorizResizer } from "../components/resizers/horizontalResizer.js";
import { handleScanConfig } from "./handleScanConfig.js"; //scan config menu events
import { setupStartScanHandler } from "./startScanHandler.js"; //handle start scan event 
import { loadTrafficMap } from "../components/traffic-map/loadTrafficMap.js"; //dynamically inject map component
import { loadTrafficGraph } from "../components/traffic-graph/loadTrafficGraph.js"; //dynamically inject graph component
import { loadEndpointInpsector } from "../components/endpoint-inspector/loadEndpointInspector.js"; //dynamically inject endpoint inspector component
import { loadTrafficTable } from "../components/traffic-table/loadTrafficTable.js"; //dynamically inject traffic table component
import { loadFlaggedTable } from "../components/flagged-endpoints/loadFlaggedTable.js"; //dynamically inject flagged endpoints component
import { loadTrustedTable } from "../components/trusted-endpoints/loadTrustedTable.js"; //dynamically inject trusted endpoints component
import { initTrafficMapEvents } from "../components/traffic-map/handleMap.js"; //refreshes map
import { initTrafficGraphEvents } from "../components/traffic-graph/generateGraph.js";
import { initEndpointInspectorEvents } from "../components/endpoint-inspector/handleEndpointInspector.js";
import { initTrafficTableEvents, updateDisplay, fetchLogFiles } from "../components/traffic-table/displayTable.js" //table display 
import { initFlaggedTableEvents, updateFlaggedTable } from "../components/flagged-endpoints/handleFlaggedTable.js";
import { initTrustedTableEvents, updateTrustedTable } from "../components/trusted-endpoints/handleTrustedTable.js";
import { loadEventLog } from "../components/event-log/loadEventLog.js";
import { initEventLog } from "../components/event-log/handleEventLog.js";
import { loadMarquee } from "../components/scan-marquee/loadMarquee.js";
import { initScanMarquee } from "../components/scan-marquee/handleMarquee.js";

export let elements = {};

//dynamically load content for active mode
export default async function loadActiveMode() {

    document.getElementById("dynamic-active-buttons").innerHTML = `
        <div id="middle-btns-${currentMode}" class="middle-buttons button-group main-menu">
            <button id="show-map-btn-${currentMode}" class="active-mode stone-btn">Traffic Map</button>
            <button id="show-graph-btn-${currentMode}" class="inactive-mode stone-btn">Create Graph</button>
            <button id="inspect-endpoint-btn-${currentMode}" class="inactive-mode stone-btn">Inspect Endpoint</button>  
        </div>
        <div id="right-btns-${currentMode}" class="right-buttons button-group main-menu">
            <button id="configure-scan-btn-${currentMode}" class="active-mode amber-btn">Configure Scan</button>
            <button id="configure-graph-btn-${currentMode}" class="inactive-mode amber-btn">Configure Graph</button>
        </div>
        <div id="event-log-wrapper-${currentMode}" class="event-log-wrapper"></div>
    `;

    document.getElementById("dynamic-active-top").innerHTML = `

        <div id="top-left-${currentMode}" class="top-left">
            <div id="scan-config-menu-${currentMode}" class="fade-in container sub-con" style="display: flex;">

                <span class="menu-title">Scan Configuration</span>
         
                <div class="g-15 v-center flex my-10">
                    <div>
                        <label for="network-interface-${currentMode}">Interface:</label>
                        <select id="network-interface-${currentMode}" class="config-item">
                            <option value="">Loading...</option>
                        </select>
                    </div>
                    <div class="g-8 flex center">
                        <button id="start-scan-${currentMode}" class="animate-button start-scan teal-btn no-bord">Start Scan</button>
                        <button id="stop-scan-${currentMode}" disabled class="animate-button stop-scan stone-btn no-bord">Stop Scan</button>
                    </div>
                </div>              

                <fieldset>
                    <legend>Scan Timing:</legend>
                    <div class="g-15 v-center flex my-10 p-5">
                        <label>
                            Start: 
                            <input type="datetime-local" id="scan-start-${currentMode}" class="config-item">
                        </label>
                        <label> 
                            End: 
                            <input type="datetime-local" id="scan-end-${currentMode}" class="config-item">
                        </label>
                    </div>
                </fieldset>

                <div id="other-live-filters">
                    <div class="g-15 v-center flex my-10">
                        <label>Aggregation Interval (s)<input type="number" value="5" id="agg-interval-${currentMode}" class="config-item ml-10 max-w-100"></label> 

                        <div class="row-selectors">
                            <label><input type="checkbox" id="exclude-private-${currentMode}" checked>Exclude Private IPs</label>
                        </div>
                    </div>
                </div>

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
                        <label><input type="radio" name="protocolGroupActive" id="select-all-protocol-${currentMode}" checked> All</label>
                        <label><input type="checkbox" class="protocol-${currentMode}" value="TCP"> TCP</label>
                        <label><input type="checkbox" class="protocol-${currentMode}" value="UDP"> UDP</label>
                        <label><input type="checkbox" class="protocol-${currentMode}" value="ICMP"> ICMP</label>
                        <label><input type="checkbox" class="protocol-${currentMode}" value="HTTP"> HTTP</label>
                        <label><input type="checkbox" class="protocol-${currentMode}" value="HTTPS"> HTTPS</label>
                    </div>
                </fieldset>
                
      
            </div>

            <div id="graph-config-menu-${currentMode}" class="fade-in container sub-con" style="display: none;"></div>
        </div>
        
        <div id="top-right-wrapper-${currentMode}" class="top-right-wrapper">

            <div id="vertical-resizer-${currentMode}" class="fade-in vertical-resizer">
                <div class="vertical-resizer-handle-wrapper">
                    <div id="vertical-resizer-handle-${currentMode}" class="vertical-resizer-handle"></div>
                </div>
            </div>

            <div id="top-right-${currentMode}" class="top-right">
                <div id="map-container-${currentMode}" class="fade-in container flex-g flex-col" style="display: flex;"></div>
                <div id="graph-container-${currentMode}" class="fade-in container flex-g flex-col center" style="display: none;"></div>
                <div id="inspection-container-${currentMode}" class="fade-in container flex-g flex-col center" style="display: none;"></div>
            </div>
        </div>
    `;
 
    document.getElementById("dynamic-active-bottom").innerHTML = `
        <div class="table-buttons-wrapper inner-bg">
            <div id="table-display-buttons-${currentMode}" class="fade-in table-display-buttons">
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
    loadEventLog(currentMode);
    loadMarquee(currentMode);
    loadTrafficMap(currentMode);
    loadTrafficGraph(currentMode);
    loadEndpointInpsector(currentMode);
    loadTrafficTable(currentMode);
    loadFlaggedTable(currentMode);
    loadTrustedTable(currentMode);

    //generate/export all DOM elements after rendering html 
    Object.assign(elements, await setupListeners("active", elements));
    //console.log("Elements ready:", elements);

    //initialize component event listers
    initVertResizer();
    initHorizResizer();
    initEventLog();
    initScanMarquee();
    initTrafficMapEvents();
    initTrafficGraphEvents();
    initEndpointInspectorEvents();
    initTrafficTableEvents();
    initFlaggedTableEvents();
    initTrustedTableEvents();

    updateDisplay(); //render intial empty traffic table 
    handleScanConfig(); //init Scan Config Listeners
    setupStartScanHandler(); //init Start Scan Handler
    fetchLogFiles(); //fill log select drop down

    
    //handle 'dynamic-active-buttons' click events
    //switch Between Map & Graph & Inspection displays
    elements[`show-map-btn-${currentMode}`].addEventListener("click", () => {
        elements[`map-container-${currentMode}`].style.display = "flex";
        elements[`graph-container-${currentMode}`].style.display = "none";
        elements[`inspection-container-${currentMode}`].style.display = "none";
    });

    elements[`show-graph-btn-${currentMode}`].addEventListener("click", () => {
        elements[`map-container-${currentMode}`].style.display = "none";
        elements[`graph-container-${currentMode}`].style.display = "flex";
        elements[`graph-config-menu-${currentMode}`].style.display = "flex";
        elements[`inspection-container-${currentMode}`].style.display = "none";
        elements[`scan-config-menu-${currentMode}`].style.display = "none";
        setActiveButton(`right-btns-${currentMode}`, `configure-graph-btn-${currentMode}`, "id");
    }); 

    elements[`inspect-endpoint-btn-${currentMode}`].addEventListener("click", () => {
        elements[`map-container-${currentMode}`].style.display = "none";
        elements[`graph-container-${currentMode}`].style.display = "none";
        elements[`inspection-container-${currentMode}`].style.display = "flex";
    });

    //switch Between scan config & Graph config menu displays
    elements[`configure-scan-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "flex";
        elements[`graph-config-menu-${currentMode}`].style.display = "none";
    });

    elements[`configure-graph-btn-${currentMode}`].addEventListener("click", () => {
        elements[`scan-config-menu-${currentMode}`].style.display = "none";
        elements[`graph-config-menu-${currentMode}`].style.display = "flex";
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

    //event Listeners for Right Button Group
    elements[`right-btns-${currentMode}`].addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            setActiveButton(`right-btns-${currentMode}`, event.target.id, "id");
        }
    });

    //event Listeners for Table Display Buttons
    elements[`table-display-buttons-${currentMode}`].addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            setActiveButton(`table-display-buttons-${currentMode}`, event.target.id, "id");
        }
    });

};








