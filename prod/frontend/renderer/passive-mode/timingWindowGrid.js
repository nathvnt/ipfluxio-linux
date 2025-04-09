export function initializeTimingGrid(mode) {
    const gridContainer = document.getElementById(`timing-grid-${mode}`);
    const timeWindowDisplay = document.getElementById(`time-window-${mode}`);
    const setTimingWindowCheckbox = document.getElementById(`set-timing-window-${mode}`);
    
    if (!gridContainer || !timeWindowDisplay) {
        console.error(`Timing grid or time window container not found for mode: ${mode}`);
        return;
    }

    gridContainer.innerHTML = "";
    timeWindowDisplay.innerHTML = "<span class='time-window-day'>Selected Time Windows:</span><br>";

    const rows = 7; //days of the week
    const cols = 48; //half-hour intervals
    const rowLabels = { 1: "Mon", 3: "Wed", 5: "Fri" }; 
    const timeLabels = { 0: "0", 12: "6", 24: "12", 36: "18", 47: "24" }; 

    let isDragging = false;
    let toggleState = null; 

    //wrapper for labels and grid
    const wrapper = document.createElement("div");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = `40px repeat(${cols}, 15px)`; 
    wrapper.style.gridTemplateRows = `20px repeat(${rows}, 15px)`; 
    wrapper.style.gap = "2px";

    //top row (time labels)
    wrapper.appendChild(document.createElement("div")); 
    for (let col = 0; col < cols; col++) {
        const timeLabel = document.createElement("div");
        timeLabel.style.fontSize = "13px";
        timeLabel.style.textAlign = "center";
        timeLabel.style.width = "12px";
        timeLabel.style.height = "24px";
        if (timeLabels[col]) {
            timeLabel.textContent = timeLabels[col];
        }
        wrapper.appendChild(timeLabel);
    }

    //grid with row labels
    for (let row = 0; row < rows; row++) {
        const rowLabel = document.createElement("div");
        rowLabel.style.fontSize = "13px";
        rowLabel.style.textAlign = "right";
        rowLabel.style.paddingRight = "5px";
        rowLabel.style.height = "12px";
        rowLabel.style.lineHeight = "12px";
        if (rowLabels[row]) {
            rowLabel.textContent = rowLabels[row];
        }
        wrapper.appendChild(rowLabel);

        //grid cells
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement("div");
            cell.classList.add("timing-cell");
            cell.dataset.row = row;
            cell.dataset.col = col;
            wrapper.appendChild(cell);
        }
    }

    //append wrapper to the grid container
    gridContainer.appendChild(wrapper);

    //cell state toggle 
    function toggleCell(cell, state = null) {
        if (state !== null) {
            cell.classList.toggle("active", state);
        } else {
            cell.classList.toggle("active");
        }
        updateTimeWindow(mode);
    }
    
    //disable grid 
    function updateGridState() {
        if (setTimingWindowCheckbox.checked) {
            gridContainer.classList.remove("timing-grid-disabled");
        } else {
            gridContainer.classList.add("timing-grid-disabled");
        }
    }

    //set initial state
    updateGridState();
    setTimingWindowCheckbox.addEventListener("change", updateGridState);

    //mouse event listeners for grid interactions
    gridContainer.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("timing-cell") && setTimingWindowCheckbox.checked) {
            isDragging = true;
            toggleState = !e.target.classList.contains("active");
            toggleCell(e.target, toggleState);
        }
    });

    gridContainer.addEventListener("mouseover", (e) => {
        if (isDragging && e.target.classList.contains("timing-cell") && setTimingWindowCheckbox.checked) {
            toggleCell(e.target, toggleState);
        }
    });

    gridContainer.addEventListener("mouseup", () => {
        if (setTimingWindowCheckbox.checked) {
            isDragging = false;
        }
    });

    gridContainer.addEventListener("mouseleave", () => {
        if (setTimingWindowCheckbox.checked) {
            isDragging = false;
        }
    });
}

//extract active time slots / display time windows for each day 
export function updateTimeWindow(mode) {
    let activeTimes = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeWindowDisplay = document.getElementById(`time-window-${mode}`);

    //parse time cells from grid
    document.querySelectorAll(`#timing-grid-${mode} .timing-cell.active`).forEach(cell => {
        let row = parseInt(cell.dataset.row);
        let col = parseInt(cell.dataset.col);
        let day = dayNames[row];

        if (!activeTimes[day]) {
            activeTimes[day] = new Set();
        }
        activeTimes[day].add(col); 
    });

    let formattedTimesDisplay = "";
    let formattedTimes = {};
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    allDays.forEach(day => {
        let activeCols = activeTimes[day] ? Array.from(activeTimes[day]).sort((a, b) => a - b) : [];
        let timeRanges = [];
        let start = null;

        //loop through all 48 possible time slots for each row (day of week)
        for (let col = 0; col < 48; col++) {
            let isActive = activeCols.includes(col);
            let startHour = Math.floor(col / 2);
            let startMinute = col % 2 === 0 ? "00" : "30";

            if (isActive) {
                if (start === null) {  //loop until finding a time-cell that is not active
                    start = `${startHour}:${startMinute}`; 
                }
            } else {
                if (start !== null) {
                    //when finding a cell that is not active mark time window 
                    let endCol = col - 1;
                    let endHour = Math.floor((endCol + 1) / 2);
                    let endMinute = (endCol + 1) % 2 === 0 ? "00" : "30"; 

                    timeRanges.push(`${start} - ${endHour}:${endMinute}`);
                    start = null; 
                }
            }
        }

        //if all 48 squares selected 
        if (start !== null) {
            timeRanges.push(`${start} - 24:00`);
        }
        formattedTimes[day] = timeRanges.length ? timeRanges : ["No time selected"];
        
        formattedTimesDisplay += `
            <div class="time-window-entry">
                <span class="time-window-day">${day}:</span>
                <span class="time-window-range">${timeRanges.length ? timeRanges.join(", ") : "No time selected"}</span>
            </div>`;
    });
    timeWindowDisplay.innerHTML = formattedTimesDisplay;
    return formattedTimes;
}




