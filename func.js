// --- CONFIGURATION ---
const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net";
const MENU_URL = `${API_BASE}/api/menu`;

// --- MODAL FUNCTIONS ---
function openModal(item) {
    // Only open if there is an image URL in the data
    if (!item.imageUrl || item.imageUrl.trim() === "") return; 

    document.getElementById('modal-img').src = item.imageUrl;
    document.getElementById('modal-title').textContent = item.name;
    document.getElementById('modal-desc').textContent = item.description;
    document.getElementById('modal-price').textContent = item.price;
    
    const modal = document.getElementById('image-modal');
    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('image-modal').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. TIME & MENU CONFIGURATION ---
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
        const statusBar = document.querySelector('.status-pill');
        
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

    // --- 5. DYNAMIC SLIDESHOW ---
    function startSlideshow(images) {
        const slideshowContainer = document.querySelector('.slideshow-container');
        if(!slideshowContainer || images.length === 0) return;

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
        
        if(slides.length > 1) {
            setInterval(() => {
                slides[idx].classList.remove('active');
                idx = (idx + 1) % slides.length;
                slides[idx].classList.add('active');
            }, 5000);
        }
    }

    fetch('slideshow.json')
        .then(response => response.json())
        .then(data => startSlideshow(data))
        .catch(error => {
            console.error("Could not load slideshow.json...", error);
            startSlideshow(['Images/Cycle/Old.jpg']); 
        });

    // --- 6. API MENU FETCHING (REPLACES CSV) ---
    async function loadAndRenderMenu() {
        try {
            console.log("Fetching menu from Azure API...");
            // Fetch from your .NET API
            const response = await fetch(`${MENU_URL}?t=${Date.now()}`);
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const menuData = await response.json();
            console.log("Menu loaded:", menuData);

            // RENDER LOGIC (Adapted from your old CSV parser)
            document.querySelectorAll('.menu-section').forEach(section => {
                const category = section.dataset.category;
                const existingHeader = section.querySelector('.section-header');
                
                // Clear old content but keep the header
                section.innerHTML = '';
                if(existingHeader) section.appendChild(existingHeader);

                // Filter data for this section
                // Note: We use .toLowerCase() to match C# data to HTML dataset
                const items = menuData.filter(i => 
                    i.category && i.category.trim().toLowerCase() === category.toLowerCase()
                );
                
                if(items.length > 0) {
                    // Group by Subcategory
                    const groups = {};
                    items.forEach(item => {
                        const sub = item.subcategory ? item.subcategory.trim() : 'General';
                        if(!groups[sub]) groups[sub] = [];
                        groups[sub].push(item);
                    });

                    // Create HTML elements
                    for (const [subcatName, subItems] of Object.entries(groups)) {
                        if(subcatName !== 'General' && subcatName !== '') {
                            const subTitle = document.createElement('h3');
                            subTitle.classList.add('subcategory-title');
                            subTitle.textContent = subcatName;
                            section.appendChild(subTitle);
                        }

                        const grid = document.createElement('div');
                        grid.classList.add('menu-grid');
                        
                        subItems.forEach(item => {
                            const card = document.createElement('div');
                            card.classList.add('menu-card');
                            
                            // Click to open modal
                            card.addEventListener('click', () => openModal(item));

                            // Check for image
                            const imageIcon = (item.imageUrl && item.imageUrl.trim() !== "") ? ' 📷' : '';

                            card.innerHTML = `
                                <h3>${item.name}${imageIcon} <span class="price">${item.price}</span></h3>
                                <p>${item.description}</p>
                            `;
                            grid.appendChild(card);
                        });
                        section.appendChild(grid);
                    }
                }
            });

            // Re-run time check now that items are in the DOM
            updateMenuAvailability();

        } catch (error) {
            console.error("Failed to load menu from API:", error);
            // Optional: Add a fallback here or alert the user
            document.getElementById('current-status-msg').textContent = "Error loading menu. Please refresh.";
        }
    }

    // Trigger the load
    loadAndRenderMenu();

});