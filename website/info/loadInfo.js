document.addEventListener("DOMContentLoaded", () => {
    const info = document.getElementById("bottom-panel");
  
    if (!info) return;
  
    info.innerHTML = `
        <div class="section-container-bottom">
            <div class="section-label">Information</div>
            <div id="information">
                <div class="information-section">
                    <span class="information-section-title amber">ipflux.io Network Traffic Analyzer</span>
                    <span class="information-section-content">
                        ipflux.io is a free and open source host-based network traffic analyzer designed for security research and 
                        endpoint detection/response (EDR). 
                    </span>
                </div>

                <div class="details-wrapper">
                    
                    <fieldset class="details-fieldset">
                        <legend class="amber">Key Features</legend>
                        <div class="information-section-bullets">
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Organize and view data in real-time using over 20 unique statistical metrics
                            </span>
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Geo-locate endpoint data using bubble and choropleth density maps 
                            </span>
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Graph data live to view and compare trends/patterns  
                            </span>
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Fully customizable scan configurations 
                            </span>
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Automated baseline generation using scheduled background processes   
                            </span>
                            <span class="information-section-content">
                                <span class="amber bullet">•</span> Automated anomaly detection, flagging endpoints demonstrating inconsistent behavior 
                            </span>
                        </div>
                    </fieldset>
                    
                    <fieldset class="details-fieldset">
                        <legend class="amber">Explore on GitHub</legend>
                        <div class="information-section-gh">
                            <div class="flex-col">
                                <span class="information-section-sub-title">
                                    Installation Instructions
                                    <a href="https://github.com/nathvnt/ipfluxio-linux/tree/master/release" target="_blank" rel="noopener noreferrer" class="github-link amber">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="gitsvg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 .5C5.73.5.5 5.74.5 12.03c0 5.12 3.32 9.47 7.94 11 .58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.23.7-3.91-1.55-3.91-1.55-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.79 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.3-5.29-5.78 0-1.28.46-2.33 1.2-3.15-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.87 1.2 3.15 0 4.49-2.72 5.48-5.3 5.77.42.36.79 1.1.79 2.23 0 1.61-.01 2.91-.01 3.3 0 .3.21.67.8.55a11.5 11.5 0 0 0 7.93-11C23.5 5.74 18.27.5 12 .5z"/>
                                        </svg>
                                    </a>
                                </span>
                                <span class="information-section-content">
                                    Download a pre-packaged distribution or build manually from source 
                                </span>
                            </div>
                            <div class="flex-col">
                                <span class="information-section-sub-title">
                                    Source Code
                                    <a href="https://github.com/nathvnt/ipfluxio-linux/tree/master/prod" target="_blank" rel="noopener noreferrer" class="github-link amber">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="gitsvg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 .5C5.73.5.5 5.74.5 12.03c0 5.12 3.32 9.47 7.94 11 .58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.23.7-3.91-1.55-3.91-1.55-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.79 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.3-5.29-5.78 0-1.28.46-2.33 1.2-3.15-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.87 1.2 3.15 0 4.49-2.72 5.48-5.3 5.77.42.36.79 1.1.79 2.23 0 1.61-.01 2.91-.01 3.3 0 .3.21.67.8.55a11.5 11.5 0 0 0 7.93-11C23.5 5.74 18.27.5 12 .5z"/>
                                        </svg>
                                    </a>
                                </span>
                                <span class="information-section-content">
                                    Check out the full source code to see how everything works! 
                                </span>
                            </div>
                            <div class="flex-col">
                                <span class="information-section-sub-title">
                                    Documentation
                                    <a href="https://github.com/nathvnt/ipfluxio-linux/tree/master" target="_blank" rel="noopener noreferrer" class="github-link amber">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="gitsvg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 .5C5.73.5.5 5.74.5 12.03c0 5.12 3.32 9.47 7.94 11 .58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.23.7-3.91-1.55-3.91-1.55-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.79 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.3-5.29-5.78 0-1.28.46-2.33 1.2-3.15-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.87 1.2 3.15 0 4.49-2.72 5.48-5.3 5.77.42.36.79 1.1.79 2.23 0 1.61-.01 2.91-.01 3.3 0 .3.21.67.8.55a11.5 11.5 0 0 0 7.93-11C23.5 5.74 18.27.5 12 .5z"/>
                                        </svg>
                                    </a>
                                </span>
                                <span class="information-section-content">
                                    Want to learn more? Read the usage instructions and setup guide
                                </span>
                            </div>
                        </div>
                    </fieldset>
                </div>

                <div class="information-section-email">
                    <span>
                        Questions?
                        <svg class="email-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 
                                    2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 
                                    4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                        email me:
                        <span class="amber email-copy" id="copy-email">support@ipflux.io</span>
                        <span class="tooltip" id="email-tooltip">Copied!</span>
                    </span>
                </div>
            </div>
        </div>
       `;
});