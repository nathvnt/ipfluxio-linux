import runLoadingAnimation from "./components/loading-animation/handleAnimation.js";
import { restartMarquee } from "./components/scan-marquee/handleMarquee.js";
import loadActiveMode from "./active-mode/loadActiveMode.js";
import loadPassiveMode from "./passive-mode/loadPassiveMode.js";
import loadComparisonMode from "./comparison-mode/loadComparisonMode.js";

export let currentMode = "active";

document.addEventListener("DOMContentLoaded", async () => {
    
    const activeModeBtn = document.getElementById("active-mode-btn");
    const passiveModeBtn = document.getElementById("passive-mode-btn");
    const liveCompBtn = document.getElementById("live-comparison-btn");

    //get current mode from `main.js`
    currentMode = await window.electronAPI.getCurrentMode();

    //nothing rendered by default
    const modeLoaded = {
        active: false,
        passive: false,
        comparison: false
    };

    //hide or display mode when clicking main menu buttons
    async function switchMode(mode) {
        //console.log(`Switching to ${mode} mode`);

        //store mode globally in `main.js`
        window.electronAPI.setCurrentMode(mode);
        currentMode = await window.electronAPI.getCurrentMode();

        //hide all containers with "dynamic-" in the ID
        document.querySelectorAll('[id^="dynamic-"]').forEach(el => {
            el.style.display = "none";
        });

        //show only the elements that match the selected mode
        document.querySelectorAll(`[id^="dynamic-${mode}"]`).forEach(el => {
            el.style.display = "flex";
        });

        //generate mode content if it hasn't been loaded before
        if (!modeLoaded[mode]) {
            if (mode === "active") loadActiveMode();
            if (mode === "passive") loadPassiveMode();
            if (mode === "comparison") loadComparisonMode();
            modeLoaded[mode] = true;
        }

        //update button styles
        if (mode === "active") {
            setActiveButton(".left-buttons", activeModeBtn.id, "class");
        } else if (mode === "passive") {
            setActiveButton(".left-buttons", passiveModeBtn.id, "class");
        } else {
            setActiveButton(".left-buttons", liveCompBtn.id, "class");
        }

        restartMarquee(mode)
    }

    //run loading animation
    await runLoadingAnimation();
    //set default mode
    switchMode(currentMode);

    // setTimeout(() => {
    //     switchMode(currentMode);
    // }, 1000);

    //event listeners to switch modes when menu buttons are clicked
    activeModeBtn.addEventListener("click", () => switchMode("active"));
    passiveModeBtn.addEventListener("click", () => switchMode("passive"));
    liveCompBtn.addEventListener("click", () => switchMode("comparison"));
});

//universal function for setting active button in button groups 
export function setActiveButton(groupSelector, activeBtnId, groupType) {
    let group;

    if (groupType === "class") {
        group = document.querySelectorAll(`${groupSelector} button`);
    } else if (groupType === "id") {
        group = document.querySelectorAll(`#${groupSelector} button`);
    }

    group.forEach(btn => {
        if (btn.id === activeBtnId) {
            btn.classList.add("active-mode");
            btn.classList.remove("inactive-mode");
        } else {
            btn.classList.add("inactive-mode");
            btn.classList.remove("active-mode");
        }
    });
}


