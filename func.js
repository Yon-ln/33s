document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURATION ---
    const CONFIG = {
        brunchStart: 9 * 60 + 30,  // 09:30
        coffeeStart: 14 * 60 + 30, // 14:30
        dinnerStart: 16 * 60,      // 16:00
        closeTime:   22 * 60 + 30  // 22:30
    };

    let isFullMenuVisible = false;

    // --- 2. TIME-BASED MENU LOGIC ---
    function updateMenuAvailability() {
        if(isFullMenuVisible) return;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const statusMsg = document.getElementById('current-status-msg');
        const statusBar = document.querySelector('.status-bar');
        
        // Sections
        const secBrunch = document.getElementById('brunch');
        const secCocktails = document.getElementById('cocktails');
        const secWines = document.getElementById('wines');
        const secBeers = document.getElementById('beers');
        const secDinner = document.getElementById('dinner');
        const secSofts = document.getElementById('softs');

        const hide = (el) => { if(el) el.classList.add('section-hidden'); };
        const show = (el) => { if(el) el.classList.remove('section-hidden'); };

        // 1. Brunch Mode
        if (currentMinutes >= CONFIG.brunchStart && currentMinutes < CONFIG.coffeeStart) {
            if(statusMsg) statusMsg.textContent = "Serving Now: Brunch & Coffee";
            if(statusBar) statusBar.classList.remove('closed');
            show(secBrunch); show(secSofts);
            hide(secCocktails); hide(secDinner); hide(secWines); hide(secBeers);
        }
        // 2. Coffee Gap
        else if (currentMinutes >= CONFIG.coffeeStart && currentMinutes < CONFIG.dinnerStart) {
            if(statusMsg) statusMsg.textContent = "Kitchen Closed (Coffee Only)";
            if(statusBar) statusBar.classList.add('closed');
            hide(secBrunch); hide(secDinner); hide(secCocktails); hide(secWines); hide(secBeers);
            show(secSofts);
        }
        // 3. Dinner Mode
        else if (currentMinutes >= CONFIG.dinnerStart && currentMinutes < CONFIG.closeTime) {
            if(statusMsg) statusMsg.textContent = "Serving Now: Dinner & Cocktails";
            if(statusBar) statusBar.classList.remove('closed');
            hide(secBrunch);
            show(secCocktails); show(secDinner); show(secWines); show(secBeers); show(secSofts);
        }
        // 4. Closed
        else {
            if(statusMsg) statusMsg.textContent = "Currently Closed";
            if(statusBar) statusBar.classList.add('closed');
            hide(secBrunch); hide(secDinner); hide(secCocktails);
        }
    }

    // Run immediately
    updateMenuAvailability();
    setInterval(updateMenuAvailability, 60000);

    // --- 3. TOGGLE BUTTON ---
    window.toggleFullMenu = function() {
        isFullMenuVisible = !isFullMenuVisible;
        const btn = document.getElementById('view-all-btn');
        if(isFullMenuVisible) {
            document.body.classList.add('show-all-menus');
            btn.textContent = "Show Current Menu";
        } else {
            document.body.classList.remove('show-all-menus');
            btn.textContent = "View Full Menu";
            updateMenuAvailability();
        }
    }

    // --- 4. SCROLL & UI ---
    const body = document.body;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            if (!body.classList.contains('sidebar-active')) body.classList.add('sidebar-active');
        } else {
            if (body.classList.contains('sidebar-active')) body.classList.remove('sidebar-active');
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('section').forEach(section => observer.observe(section));

    // --- 5. DYNAMIC SLIDESHOW (From JSON) ---
    function startSlideshow(images) {
        const slideshowContainer = document.querySelector('.slideshow-container');
        if(!slideshowContainer || images.length === 0) return;

        // Clear any existing slides
        slideshowContainer.innerHTML = ''; 

        images.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.classList.add('slide');
            if(i === 0) slide.classList.add('active');
            slide.style.backgroundImage = `url('${url}')`;
            slideshowContainer.appendChild(slide);
        });

        let idx = 0;
        const slides = document.querySelectorAll('.slide');
        
        // Only cycle if we have more than 1 image
        if(slides.length > 1) {
            setInterval(() => {
                slides[idx].classList.remove('active');
                idx = (idx + 1) % slides.length;
                slides[idx].classList.add('active');
            }, 5000);
        }
    }

    // FETCH THE IMAGE LIST
    fetch('slideshow.json')
        .then(response => response.json())
        .then(data => {
            startSlideshow(data);
        })
        .catch(error => {
            console.error("Could not load slideshow.json...", error);
            // MAKE SURE THIS MATCHES EXACTLY TOO
            startSlideshow(['Images/Cycle/Old.jpg']); 
        });


    // --- 6. CSV MENU PARSER ---
    Papa.parse('menu.csv', {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            const menuData = results.data;
            document.querySelectorAll('.menu-section').forEach(section => {
                const category = section.dataset.category;
                const grid = section.querySelector('.menu-grid');
                const items = menuData.filter(i => i.category && i.category.trim().toLowerCase() === category.toLowerCase());
                
                if(items.length > 0) {
                    items.forEach(item => {
                        const card = document.createElement('div');
                        card.classList.add('menu-card');
                        card.innerHTML = `<h3>${item.name} <span class="price">${item.price}</span></h3><p>${item.description}</p>`;
                        grid.appendChild(card);
                    });
                }
            });
            updateMenuAvailability(); 
        }
    });
});

