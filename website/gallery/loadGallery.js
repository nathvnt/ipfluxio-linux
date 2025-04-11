document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("top-panel");
  
    if (!gallery) return;
  
    gallery.innerHTML = `
        <div class="section-container-top">
            <div class="section-label">Gallery</div>
            <div id="gallery">
                <button class="carousel-btn left" onclick="moveSlide(-1)">&#10094;</button>
                <div class="gallery-track" id="gallery-track">
                    <div class="gallery-item"><img src="./gallery/content/ipfss1.png" /></div> 
                    <div class="gallery-item"><img src="./gallery/content/ipfss2.png" /></div>
                    <div class="gallery-item"><img src="./gallery/content/ipfss3.png" /></div>
                    <div class="gallery-item"><img src="./gallery/content/ipfss1.png" /></div>
                    <div class="gallery-item"><img src="./gallery/content/ipfss2.png" /></div> 
                </div>
                <button class="carousel-btn right" onclick="moveSlide(1)">&#10095;</button>
            </div>
            <div id="carousel-dots" class="carousel-dots">
                <span class="dot active"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>                  
        </div>
       `;
});