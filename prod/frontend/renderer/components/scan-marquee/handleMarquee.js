export async function initScanMarquee() {
    window.electronAPI.receive("scan-marquee-update", (scanData) => {
        updateScanMarquee(scanData);
    });
    
    window.electronAPI.receive("scan-marquee-reset", (scanType) => {
        const container = document.getElementById(`marquee-container-${scanType}`);
        const marqueeContent = document.getElementById(`marquee-content-${scanType}`);
        const dot = document.getElementById(`status-dot-${scanType}`);

        if (container) {
            container.style.width = "200px";
        }

        if (dot) {
            dot.style.backgroundColor = "#ff4d4d";
            dot.style.boxShadow = "0 0 6px #ff4d4d99";
            dot.classList.remove("pulse");
        }

        const scanTypeLabel = scanType.toUpperCase();
        marqueeContent.innerText = `NO ${scanTypeLabel} SCAN DETECTED`;

        if (marqueeTimers[scanType]) {
            clearInterval(marqueeTimers[scanType]);
            marqueeTimers[scanType] = null;
        }
        marqueeScanState[scanType] = null;
    });
}

const marqueeTimers = {
    active: null,
    passive: null
};

const marqueeScanState = {
    active: null,
    passive: null
};


function updateScanMarquee({ scanType, pid, logPath, startTime }) {
    marqueeScanState[scanType] = { scanType, pid, logPath, startTime };

    const container = document.getElementById(`marquee-container-${scanType}`);
    const marqueeContent = document.getElementById(`marquee-content-${scanType}`);
    const dot = document.getElementById(`status-dot-${scanType}`);
    const logFileName = logPath.split("/").pop();
    const scanTypeLabel = scanType.toUpperCase();

    if (container) {
        container.style.width = "500px";
        container.classList.add("hidden");
    }

    if (dot) {
        dot.style.backgroundColor = "#00cc66";
        dot.style.boxShadow = "0 0 6px #00cc6699";
        dot.classList.add("pulse"); 
    }

    function updateTime() {
        const elapsed = Date.now() - new Date(startTime).getTime();
        const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        marqueeContent.innerText = `${scanTypeLabel} SCAN IS LIVE (PID: ${pid}); ${logFileName}; Time Elapsed: ${minutes}:${seconds}`;
    }

    setTimeout(() => {
        updateTime();
        if (marqueeTimers[scanType]) {
            clearInterval(marqueeTimers[scanType]);
        }
        marqueeTimers[scanType] = setInterval(updateTime, 1000);

        setTimeout(() => {
            container?.classList.remove("hidden");
        }, 3000);
    }, 150);
}

export function restartMarquee(scanType) {
    //prevent marquee content from getting lost when switching modes 
    const oldMarquee = document.getElementById(`marquee-text-${scanType}`);
    if (!oldMarquee) return;

    const container = oldMarquee.parentElement;
    const contentHTML = oldMarquee.innerHTML;

    container.removeChild(oldMarquee);

    const newMarquee = document.createElement("marquee");
    newMarquee.id = `marquee-text-${scanType}`;
    newMarquee.className = "marquee-text";
    newMarquee.setAttribute("behavior", "scroll");
    newMarquee.setAttribute("direction", "left");
    newMarquee.setAttribute("scrollamount", "4");
    newMarquee.innerHTML = contentHTML;

    container.appendChild(newMarquee);

    const savedScanData = marqueeScanState[scanType];
    if (savedScanData) {
        updateScanMarquee(savedScanData);
    }
}
