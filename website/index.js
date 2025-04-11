document.addEventListener('DOMContentLoaded', () => {
    //navigation 
    const sectionMapAutoScroll = {
      "home-btn": "top-panel",
      "info-btn": "info-divider",
    };

    const BANNER_HEIGHT = document.getElementById("top-banner").offsetHeight;
    const buttons = document.querySelectorAll(".banner-btn");
    const sectionOffsets = {
      "top-panel": -30,
      "info-divider": +15
    };
    
    //on click event (auto scroll to section)
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const sectionId = sectionMapAutoScroll[btn.id];
        const section = document.getElementById(sectionId);
        let offset = section.offsetTop - BANNER_HEIGHT + (sectionOffsets[sectionId] || 0);

        document.getElementById("ui-wrapper").scrollTo({
          top: offset,
          behavior: "smooth",
        });
      });
    });
    
    //intersection observer to update active menu button 
    const sectionMapIntersect = {
      "home-btn": "top-panel",
      "info-btn": "bottom-panel",
    };

    const sectionElementsIntersect = Object.values(sectionMapIntersect).map(id =>
      document.getElementById(id)
    );

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const visibleId = entry.target.id;
            const activeBtnId = Object.keys(sectionMapIntersect).find(
              key => sectionMapIntersect[key] === visibleId
            );
  
            buttons.forEach(btn => {
              btn.classList.remove("active-mode");
              btn.classList.add("inactive-mode");
            });
  
            const activeBtn = document.getElementById(activeBtnId);
            if (activeBtn) {
              activeBtn.classList.add("active-mode");
              activeBtn.classList.remove("inactive-mode");
            }
          }
        });
      },
      {
        root: document.getElementById("ui-wrapper"), 
        threshold: 0.7,
      }
    );
  
    sectionElementsIntersect.forEach(section => {
      if (section) observer.observe(section);
    });


    //-------------------------------------------------------------------------------
    //gallery image carousel 
    const track = document.getElementById('gallery-track');
    const slides = track.children;
    const totalSlides = 3;
    let currentIndex = 1; 
    let isTransitioning = false;
    const dots = document.querySelectorAll('.dot');

    //set initial position
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  
    window.moveSlide = function(direction) {
      if (isTransitioning) return;

      isTransitioning = true; //prevent multiple transitions from starting 

      if (track.style.transition === '') {
        track.style.transition = 'transform 0.5s ease';
      }
  
      currentIndex += direction;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      track.addEventListener('transitionend', handleTransitionEnd, { once: true });
    };
  
    function handleTransitionEnd() {
      track.style.transition = 'none';
  
      if (currentIndex === 0) { //jump to last
        currentIndex = totalSlides;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      }
  
      if (currentIndex === totalSlides + 1) { //jump to first 
        currentIndex = 1;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      }
  
      void track.offsetWidth; //reset
      track.style.transition = 'transform 0.5s ease';
      isTransitioning = false;
      updateDots(); 
    }

    //show which image is being displayed 
    function updateDots() {
      dots.forEach(dot => dot.classList.remove('active'));
      let visibleIndex = currentIndex - 1;
      if (currentIndex === 0) visibleIndex = totalSlides - 1;
      if (currentIndex === totalSlides + 1) visibleIndex = 0;
      dots[visibleIndex].classList.add('active');
    }
    updateDots(); //init starting dot


    //--------------------------------------------------------------------------
    //copy email onclick and show tool tip 
    const emailSpan = document.getElementById("copy-email");
    const tooltip = document.getElementById("email-tooltip");
  
    if (!emailSpan || !tooltip) {
      console.error("Elements not found!");
      return;
    }
  
    emailSpan.addEventListener("click", () => {
      const email = emailSpan.textContent.trim();
  
      navigator.clipboard.writeText(email).then(() => {
        tooltip.classList.add("show");
        setTimeout(() => {
          tooltip.classList.remove("show");
        }, 1500);
      }).catch(err => {
        console.error("Clipboard error:", err);
      });
    });
});
  

