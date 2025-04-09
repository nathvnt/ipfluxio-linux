export default function setupListeners(mode, existingElements = {}) {
    return new Promise((resolve) => {
        setTimeout(() => {  //ensure DOM updates before accessing elements

            //define prefixes for all elements 
            const allElementIds = [

                //dynamic menu buttons 
                "middle-btns-",
                "show-map-btn-",
                "show-graph-btn-",
                "inspect-endpoint-btn-",
                "right-btns-",
                "configure-scan-btn-",
                "configure-graph-btn-",
                "refresh-map-btn-",

                //scan schedule component
                "schedule-wrapper-",
                "schedule-container-",
                "schedule-entries-wrap-",
                "schedule-entries-",
                "schedule-toggle-",
                "schedule-dropdown-",

                //event log component 
                "event-log-wrapper-",
                "event-log-container-",
                "event-log-entries-wrap-",
                "event-log-entries-",
                "event-log-toggle-",
                "event-log-dropdown-",
                
                //containers for re-sizing top right panel 
                "top-left-",
                "top-right-wrapper-",
                "top-right-",
                "vertical-resizer-",
                "vertical-resizer-handle-",
                
                //scan config menus 
                "scan-config-menu-",
                "timing-grid-",
                "start-scan-",
                "stop-scan-",
                "scan-start-",
                "scan-end-",
                "agg-interval-",
                "exclude-private-",
                "select-all-protocol-",
                "new-baseline-",
                "add-to-existing-",
                "select-baseline-",
                "network-interface-",
                "background-scan-",
                "set-timing-window-",
        
                //map component 
                "map-container-",
                "map-menu-",
                "traffic-map-",
        
                //graph component 
                "graph-container-",
                "graph-config-menu-",
                "attach-live-",
                "graph-start-",
                "graph-end-",
                "data-points-",
                "data-point-toggle-",
                "data-point-dropdown-",
                "selected-endpoints-toggle-",
                "selected-endpoints-dropdown-",
                "generate-graph-btn-",
                "graph-display-",
                "traffic-graph-",
                "individual-endpoints-",
                "parallel-endpoints-",
                "combined-endpoints-",
        
                //endpoint inspector component 
                "inspection-container-",
                "endpoint-inspection-wrapper-",
                "selected-endpoint-menu-",
                "endpoint-data-toggle-",
                "selected-endpoint-",
                "refresh-historical-data-",
                "refresh-security-data-",
                "historical-table-container-",
                "security-table-container-",
        
                //bottom panel components 
                "table-display-buttons-",
                "show-traffic-table-",
                "show-flagged-",
                "show-trusted-",
                "flagged-endpoints-container-",
                "trusted-endpoints-container-",
                "flagged-endpoints-menu-",
                "refresh-flagged-data-", 
                "flagged-endpoints-table-wrapper-",
                "trusted-endpoints-table-wrapper-",
        
                "traffic-log-container-",
                "table-config-menu-",
                "table-config-",
                "table-config-toggle-btn-",
                "traffic-log-",
                "log-controls-",
                "log-select-",
                "load-log-btn-",
                "column-controls-",  
                "column-toggle-",
                "column-dropdown-",
                "sorting-controls-",  
                "sort-select-",      
                "sort-asc-",        
                "sort-desc-",
                "filter-controls-", 
                "filter-column-",        
                "filter-options-", 
                "add-filter-btn-",
                "clear-filters-btn-",
                "active-filters-",
                "toggle-filters-",
                "filter-dropdown-",
                "select-all-",
                "select-five-",
                "traffic-table-"
            ]

            const dynamicElementIds = {
                active: [],
                passive: [],
                comparison: []
            };

            if (!dynamicElementIds.hasOwnProperty(mode)) {
                console.warn(`setupListeners: Unknown mode "${mode}"`);
                resolve(existingElements); 
                return;
            }

            //update existing elements with set of new elements 
            const updatedElements = { ...existingElements };

            //add mode to each prefix and fill corresponding set in dynamicElementIds
            dynamicElementIds[mode] = allElementIds.map(prefix => `${prefix}${mode}`);

            //define new elements in DOM and add to updated object 
            dynamicElementIds[mode].forEach(id => {
                const el = document.getElementById(id);
                if (el) updatedElements[id] = el;
            });

            //resolve updated elements object
            resolve(updatedElements);

        }, 50); 
    });
}
