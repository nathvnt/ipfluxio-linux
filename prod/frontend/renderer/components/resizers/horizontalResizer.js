export async function initHorizResizer() {

    //event listeners for resizing height of bottom panel
    const bottomResizer = document.getElementById('bottom-resizer');
    const bottomWrapper = document.getElementById('bottom-panel-wrapper');
    const rightPanel = document.querySelector('.top-right');
    const leftPanel = document.querySelector('.top-left');
    const uiWrapper = document.getElementById('ui-wrapper');
    
    let isBottomDragging = false;
    let initialHeightPercent = 50; 
    
    bottomWrapper.style.height = `${initialHeightPercent}%`; 
    
    bottomResizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isBottomDragging = true;
        document.body.style.cursor = "ns-resize";
        bottomWrapper.style.transition = "none";

        rightPanel.style.pointerEvents = "none";
        leftPanel.style.pointerEvents = "none";
    });
    
    document.addEventListener("mousemove", (e) => {
      if (!isBottomDragging) return;
    
      const wrapperRect = uiWrapper.getBoundingClientRect();
      const totalHeight = wrapperRect.height;
      const offsetY = e.clientY - wrapperRect.top;

      let newBottomHeight = totalHeight - offsetY ;
      let heightPercent = (newBottomHeight / totalHeight) * 100;
    
      //clamp 
      const minHeightPercent = initialHeightPercent; 
      const maxHeightPercent = 94.5; 
    
      if (heightPercent < minHeightPercent) heightPercent = minHeightPercent;
      if (heightPercent > maxHeightPercent) heightPercent = maxHeightPercent;
    
      bottomWrapper.style.height = `${heightPercent}%`;
    });
    
    document.addEventListener("mouseup", () => {
      if (isBottomDragging) {
        isBottomDragging = false;
        document.body.style.cursor = "default";
        bottomWrapper.style.transition = "height 0.2s ease";
        
        rightPanel.style.pointerEvents = "auto";
        leftPanel.style.pointerEvents = "auto";
      }
    });
};