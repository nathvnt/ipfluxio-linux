export function loadMarquee(mode) {
    const marqueeDiv = `
        <div id="marquee-container-${mode}" class="marquee-container">
            <marquee id="marquee-text-${mode}" behavior="scroll" direction="left" scrollamount="4" class="marquee-text">
                <span class="status-dot" id="status-dot-${mode}"></span>
                <span id="marquee-content-${mode}" class="marquee-content">
                    NO ${mode.toUpperCase()} SCAN DETECTED
                </span>
            </marquee>
        </div>
    `;
    document.getElementById(`scan-marquee-${mode}`).innerHTML = marqueeDiv;
}

