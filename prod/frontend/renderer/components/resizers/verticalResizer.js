import { currentMode } from "../../index.js";
import { elements } from "../../active-mode/loadActiveMode.js";

const resizeVars = {
    active: {
        resizer: null,
        rightWrapper: null,
        rightPanel: null,
        leftPanel: null,
        container: null,
        chartDom: null,
    },
    passive: {
        resizer: null,
        rightWrapper: null,
        rightPanel: null,
        leftPanel: null,
        container: null,
        chartDom: null,
    }
};

export async function initVertResizer() {

    resizeVars[currentMode].resizer = elements[`vertical-resizer-${currentMode}`];
    resizeVars[currentMode].rightWrapper = elements[`top-right-wrapper-${currentMode}`];
    resizeVars[currentMode].rightPanel = elements[`top-right-${currentMode}`];
    resizeVars[currentMode].leftPanel = elements[`top-left-${currentMode}`];
    resizeVars[currentMode].container = document.getElementById(`dynamic-${currentMode}-top`);
    resizeVars[currentMode].chartDom = elements[`traffic-graph-${currentMode}`];

    let isDragging = false;

    resizeVars[currentMode].resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        document.body.style.cursor = "ew-resize";
        resizeVars[currentMode].rightWrapper.style.transition = "none"; 
        resizeVars[currentMode].rightPanel.style.pointerEvents = "none";
        resizeVars[currentMode].leftPanel.style.pointerEvents = "none";
    });

    document.addEventListener("mousemove", (e) => {

        if (!isDragging) return;

        const containerRect = resizeVars[currentMode].container.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const offsetX = e.clientX - containerRect.left;

        //clamp
        const minLeft = 0;
        const maxLeft = totalWidth * 0.4;

        let newLeft = offsetX;
        if (newLeft < minLeft) newLeft = minLeft;
        if (newLeft > maxLeft) newLeft = maxLeft;

        const newWidth = totalWidth - newLeft;

        //update wrapper
        resizeVars[currentMode].rightWrapper.style.left = `${newLeft}px`;
        resizeVars[currentMode].rightWrapper.style.width = `${newWidth - 16}px`;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "default";
            resizeVars[currentMode].rightWrapper.style.transition = "width 0.2s ease, left 0.2s ease";

            resizeVars[currentMode].rightPanel.style.pointerEvents = "auto";
            resizeVars[currentMode].leftPanel.style.pointerEvents = "auto";

            if (resizeVars[currentMode].chartDom) {
                echarts.getInstanceByDom(resizeVars[currentMode].chartDom).resize();
            }
        }
    });
};