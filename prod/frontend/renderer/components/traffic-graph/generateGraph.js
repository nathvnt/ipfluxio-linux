import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";
import { graphCFG, validateGraphConfig, initGraphDataScopeEvents, initGraphDropdownEvents } from "./handleGraphConfig.js"

const colorPalette = ["#9333EA", "#D97706", "#0891B2", "#059669", "#B91C1C"]; 
const LIVE_CHECK_INTERVAL = 2;

//generate a graph
export async function generateGraph(state) {
    const cfg = graphCFG[currentMode];
    if (state === currentMode) {
        if (cfg.selectedEndpoints.size === 0 || cfg.selectedMetrics.size === 0) {
            alert("Please select at least one endpoint and one data point.");
            return;
        }

        //convert time interval from config input to valid format
        cfg.startTimeUnix = new Date(cfg.startTimeInput.value).getTime() / 1000;
        cfg.endTimeUnix = new Date(cfg.endTimeInput.value).getTime() / 1000;
        
        if (!cfg.startTimeUnix || !cfg.endTimeUnix || cfg.startTimeUnix >= cfg.endTimeUnix) {
            alert("Please select a valid time range.");
            return;
        }

        //update log data
        cfg.logData = await new Promise((resolve, reject) => {
            window.electronAPI.readLogFile(cfg.logPath, (data) => {
                if (data) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        console.error("Error parsing log file:", error);
                        reject(null);
                    }
                } else {
                    console.error("Failed to read log file.");
                    reject(null);
                }
            });
        });

        //reset series and color index
        cfg.series = [];
        cfg.colorIndex = 0;


        if (cfg.selectedScope === "individual") {
            Array.from(cfg.selectedEndpoints).forEach((endpoint) => {
                let history = cfg.logData.endpoints[endpoint]?.history || [];
        
                Array.from(cfg.selectedMetrics).forEach((metric) => {
                    let processedData = processTimeSeries(history, metric, cfg.startTimeUnix, cfg.endTimeUnix);
        
                    cfg.series.push({
                        name: metric,
                        type: "line",
                        data: processedData.map(point => [point.x, point.y, endpoint]), 
                        smooth: true,
                        lineStyle: { width: 2, color: colorPalette[cfg.colorIndex % colorPalette.length] },
                        itemStyle: { color: colorPalette[cfg.colorIndex % colorPalette.length] }
                    });

                    cfg.colorIndex++; 
                });
            });
        } else if (cfg.selectedScope === "combined") {

            //collect and sort all unique timestamps from endpoint history in log data 
            let allTimestamps = new Set();
            
            Array.from(cfg.selectedEndpoints).forEach((endpoint) => {
                let history = cfg.logData.endpoints[endpoint]?.history || [];
                history.forEach(entry => {
                    allTimestamps.add(entry.timestamp); 
                });
            });
        
            let sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b); //sort timestamps
        
            //sum values for selected metric at each timestamp
            Array.from(cfg.selectedMetrics).forEach((metric) => {
                let timestampSums = new Map();
        
                sortedTimestamps.forEach(timestamp => {
                    timestampSums.set(timestamp, 0); 
                });
        
                cfg.selectedEndpoints.forEach((endpoint) => {
                    let history = cfg.logData.endpoints[endpoint]?.history || [];
        
                    history.forEach(entry => {
                        if (entry.hasOwnProperty(metric)) {
                            timestampSums.set(entry.timestamp, timestampSums.get(entry.timestamp) + entry[metric]);
                        }
                    });
                });
        
                //format data for ECharts 
                let formattedData = Array.from(timestampSums, ([x, y]) => [x * 1000, y]); 
        
                cfg.series.push({
                    name: metric, 
                    type: "line",
                    data: formattedData,
                    smooth: true,
                    lineStyle: { width: 2, color: colorPalette[cfg.colorIndex % colorPalette.length] },
                    itemStyle: { color: colorPalette[cfg.colorIndex % colorPalette.length] }
                });
        
                cfg.colorIndex++;
            });
        } else if (cfg.selectedScope === "parallel") {
            if (cfg.selectedMetrics.size > 1) {
                console.warn("Parallel scope requires exactly one selected metric.");
                return;
            }
        
            let selectedMetric = Array.from(cfg.selectedMetrics)[0]; 
        
            Array.from(cfg.selectedEndpoints).forEach((endpoint) => {
                let history = cfg.logData.endpoints[endpoint]?.history || [];
                let processedData = processTimeSeries(history, selectedMetric, cfg.startTimeUnix, cfg.endTimeUnix);
        
                cfg.series.push({
                    name: endpoint, 
                    type: "line",
                    data: processedData.map(point => [point.x, point.y, endpoint]), 
                    smooth: true,
                    lineStyle: { width: 2, color: colorPalette[cfg.colorIndex % colorPalette.length] },
                    itemStyle: { color: colorPalette[cfg.colorIndex % colorPalette.length] }
                });
        
                cfg.colorIndex++;
            });
        }
        //render the graph
        await renderChart(cfg.series, cfg.selectedScope, cfg.selectedEndpoints, cfg.selectedMetrics, cfg.liveCheckbox);
    
        //handle live updates
        if (cfg.liveCheckbox) {
            setTimeout(async () => {
                const checkResult = await window.electronAPI.checkLiveScan(cfg.logFile);
                if (checkResult.success && validateGraphConfig()) {
                    //console.log("REFRESHING GRAPH")
                    generateGraph(state); 
                } else { 
                    //console.warn("stopping updates...");
                    cfg.generateClicked = false;
                    return;
                }
            }, 5000);
        }
    } else {
        //console.log("SKIPPING REFRESH")
        setTimeout(async () => { 
            generateGraph(state); 
        }, 5000);
    }
}

//convert endpoint log history data to time-series format
function processTimeSeries(history, metric, startTime, endTime) {
    let series = [];

    history.forEach((entry) => {
        if (entry.timestamp < startTime || entry.timestamp > endTime) return;

        if (entry.hasOwnProperty(metric)) {
            series.push({ x: new Date(entry.timestamp * 1000), y: entry[metric] });
        } else {
            console.warn(`Metric "${metric}" not found in history entry`, entry);
        }
    });

    return series;
}

//render graph using Apache ECharts 
async function renderChart(series, selectedScope, selectedEndpoints, selectedMetrics, liveMode = false) {
    
    let chartDom = elements[`traffic-graph-${currentMode}`];

    if (series.length === 0 && elements[`traffic-graph-${currentMode}`]) {
        chartDom.innerHTML = "<div class='error-message'>Graph has not been configured yet.</div>";
        return;
    }
  
    chartDom.innerHTML = "";

    if (chartDom.echartsInstance) {
        chartDom.echartsInstance.dispose();
    }

    let myChart = graphCFG[currentMode].echarts.init(chartDom, null, {
        renderer: "canvas",
        useDirtyRect: true, 
    });

    let titleText = "";
    let selectedEndpointsArr = Array.from(selectedEndpoints);
    let selectedMetricsArr = Array.from(selectedMetrics);
    
    if (selectedScope === "individual" && selectedEndpointsArr.length === 1) {
        titleText = `${selectedEndpointsArr[0]} Data`;
    } else if (selectedScope === "combined" && selectedMetricsArr.length < 6) {
        titleText = `Combined Endpoint Data`;
    } else if (selectedScope === "parallel" && selectedMetricsArr.length < 6) {
        titleText = `Parallel ${selectedMetricsArr[0]} Data`;
    }    
    
    const allTimestamps = series.flatMap(s => s.data.map(point => point[0]));

    let xAxisMin = Math.min(...allTimestamps);
    let xAxisMax = Math.max(...allTimestamps);

    let option = {
        title: {
            text: titleText,
            left: "left",
            textStyle: { color: "#fff", fontSize: 12 }
        },
        tooltip: { trigger: "axis" },
        xAxis: {
            type: "time",
            name: "Time",
            min: xAxisMin || null,
            max: xAxisMax || null,
            axisLabel: { formatter: "{HH}:{mm}", color: "#fff" },
            axisLine: { lineStyle: { color: "#ccc" } }
        },              
        yAxis: {
            type: "value",
            name: "Rate",
            axisLabel: { color: "#fff" },
            axisLine: { lineStyle: { color: "#ccc" } },
            splitLine: { lineStyle: { color: "#444" } } 
        },
        series: series,
        legend: {
            show: true,
            top: "top", 
            textStyle: { color: "#fff", fontSize: 11 },
        },
        grid: {
            left: "5%",
            right: "10%",
            bottom: "10%",
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {},
            }
        },
        animation: !liveMode
    };

    myChart.setOption(option);
    chartDom.echartsInstance = myChart;

    window.addEventListener("resize", () => {
        myChart.resize();
    });
}


// function graphContainerIsVisible(mode) {
//     const container = elements[`traffic-graph-${mode}`];
//     return container && container.offsetParent !== null;
// }


//init generate graph event listeners with function
export async function initGenerateGraphEvents() {

    // disable the generate graph button by default
    elements[`generate-graph-btn-${currentMode}`].disabled = true;
    
    //listen for click to make graph
    if (elements[`generate-graph-btn-${currentMode}`]) {
        elements[`generate-graph-btn-${currentMode}`].addEventListener("click", () => {
            if (validateGraphConfig()) {
                graphCFG[currentMode].generateClicked = true;
                window.electronAPI.logEvent(`[GENERATING NEW GRAPH ${currentMode} MODE]`);
                generateGraph(currentMode);
            }
        });
    }

    //show 'graph not configured' message on load
    renderChart([], "", [], []); 
};


//init all even listeners for graph component 
export async function initTrafficGraphEvents() {
    initGenerateGraphEvents();
    initGraphDataScopeEvents();
    initGraphDropdownEvents();
};
