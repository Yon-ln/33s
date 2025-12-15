document.addEventListener('DOMContentLoaded', () => {
    
    // route to controller
    const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net"; //
    const MENU_URL = `${API_BASE}/api/menu`;
    
    // Time Configuration (Minutes from midnight)
    const CONFIG = {
        brunchStart: 9 * 60 + 30,  // 09:30
        coffeeStart: 14 * 60 + 30, // 14:30
        dinnerStart: 16 * 60,      // 16:00
        closeTime:   22 * 60 + 30  // 22:30
    };

    const body = document.body;
    const viewAllBtn = document.getElementById('view-all-btn');
    const statusMsg = document.getElementById('current-status-msg');
    const statusBar = document.querySelector('.status-pill');

    // --- 2. MENU AVAILABILITY LOGIC ---
    function updateMenuAvailability() {
        // If user clicked "View Full", stop filtering
        if (body.classList.contains('show-all-menus')) {
            document.querySelectorAll('.menu-section').forEach(el => el.classList.remove('section-hidden'));
            statusMsg.textContent = "Viewing All Menus";
            statusBar.classList.remove('closed');
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Helper to toggle visibility
        const toggle = (id, shouldShow) => {
            const el = document.getElementById(id);
            if(el) {
                if(shouldShow) el.classList.remove('section-hidden');
                else el.classList.add('section-hidden');
            }
        };

        // Determine Service State
        let state = 'closed';
        if (currentMinutes >= CONFIG.brunchStart && currentMinutes < CONFIG.coffeeStart) state = 'brunch';
        else if (currentMinutes >= CONFIG.coffeeStart && currentMinutes < CONFIG.dinnerStart) state = 'coffee';
        else if (currentMinutes >= CONFIG.dinnerStart && currentMinutes < CONFIG.closeTime) state = 'dinner';

        // Apply State
        switch(state) {
            case 'brunch':
                statusMsg.textContent = "Serving: Brunch & Coffee";
                statusBar.classList.remove('closed');
                toggle('brunch', true); toggle('softs', true);
                toggle('cocktails', false); toggle('dinner', false); toggle('wines', false); toggle('beers', false);
                break;
            case 'coffee':
                statusMsg.textContent = "Kitchen Closed (Coffee Only)";
                statusBar.classList.add('closed'); // Red dot
                toggle('softs', true);
                toggle('brunch', false); toggle('cocktails', false); toggle('dinner', false); toggle('wines', false); toggle('beers', false);
                break;
            case 'dinner':
                statusMsg.textContent = "Serving: Dinner & Cocktails";
                statusBar.classList.remove('closed');
                toggle('brunch', false);
                toggle('cocktails', true); toggle('dinner', true); toggle('wines', true); toggle('beers', true); toggle('softs', true);
                break;
            default: // Closed
                statusMsg.textContent = "Currently Closed";
                statusBar.classList.add('closed');
                document.querySelectorAll('.menu-section').forEach(el => el.classList.add('section-hidden'));
                break;
        }
    }

    // Toggle "View All" Button Logic
    if(viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            body.classList.toggle('show-all-menus');
            
            if (body.classList.contains('show-all-menus')) {
                viewAllBtn.textContent = "Show Current";
            } else {
                viewAllBtn.textContent = "View Full";
            }
            updateMenuAvailability();
        });
    }

    // Check time every minute
    setInterval(updateMenuAvailability, 60000);

    // --- 3. SCROLL INTERACTION (Desktop Sidebar Trigger) ---
    window.addEventListener('scroll', () => {
        const scrollThreshold = window.innerHeight * 0.15; // 15% down page
        if (window.scrollY > scrollThreshold) {
            if (!body.classList.contains('sidebar-active')) body.classList.add('sidebar-active');
        } else {
            if (body.classList.contains('sidebar-active')) body.classList.remove('sidebar-active');
        }
    });

    // Nav Link Highlighter (ScrollSpy)
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

    // --- 4. MOBILE MENU LOGIC ---
    // We attach these to window so your HTML onclicks work, 
    // or you can remove the onclicks in HTML and rely on IDs.
    
    window.toggleMobileSidebar = function() {
        body.classList.toggle('mobile-open');
    };

    window.closeMobileSidebar = function() {
        body.classList.remove('mobile-open');
    };

    // Close mobile menu if clicking outside of it
    document.addEventListener('click', (e) => {
        const nav = document.getElementById('main-nav');
        const toggle = document.getElementById('mobile-menu-toggle');
        
        // Only run if menu is open
        if (body.classList.contains('mobile-open')) {
            // If click is NOT on the nav AND NOT on the toggle button
            if (nav && !nav.contains(e.target) && toggle && !toggle.contains(e.target)) {
                closeMobileSidebar();
            }
        }
    });

    // --- 5. DATA FETCHING & RENDERING (With Inline Expansion) ---
    async function loadAndRenderMenu() {
        try {
            console.log("Fetching menu...");
            const response = await fetch(`${MENU_URL}?t=${Date.now()}`);
            if (!response.ok) throw new Error("API Error");
            
            const menuData = await response.json();

            document.querySelectorAll('.menu-section').forEach(section => {
                const category = section.dataset.category;
                // Filter items for this section
                const items = menuData.filter(i => 
                    i.category && i.category.trim().toLowerCase() === category.toLowerCase()
                );
                
                const grid = section.querySelector('.menu-grid');
                if(items.length > 0 && grid) {
                    grid.innerHTML = ''; // Clear loading text
                    
                    // Group Items by Subcategory
                    const groups = {};
                    items.forEach(item => {
                        const sub = item.subcategory ? item.subcategory.trim() : 'General';
                        if(!groups[sub]) groups[sub] = [];
                        groups[sub].push(item);
                    });

                    // Render
                    for (const [subcatName, subItems] of Object.entries(groups)) {
                        // Add Subcategory Title if needed
                        if(subcatName !== 'General' && subcatName !== '') {
                            const subTitle = document.createElement('h3');
                            subTitle.classList.add('subcategory-title');
                            subTitle.textContent = subcatName;
                        }

                        subItems.forEach(item => {
                            const card = document.createElement('div');
                            card.classList.add('menu-card');
                            
                            // Check if image exists
                            const hasImage = (item.imageUrl && item.imageUrl.trim() !== "");
                            
                            // Add expand icon if image exists
                            const expandIcon = hasImage ? '<span class="expand-icon">▼</span>' : '';

                            // CLICK HANDLER: Toggle 'expanded' class
                            if(hasImage) {
                                card.onclick = () => {
                                    card.classList.toggle('expanded');
                                };
                            }

                            // INJECT HTML
                            const imageHTML = hasImage 
                                ? `<div class="card-image-container"><img src="${item.imageUrl}" loading="lazy" alt="${item.name}"></div>` 
                                : '';

                            card.innerHTML = `
                                <h3>
                                    <span>${item.name} ${expandIcon}</span> 
                                    <span class="price">${item.price}</span>
                                </h3>
                                <p>${item.description || ''}</p>
                                ${imageHTML}
                            `;
                            
                            grid.appendChild(card);
                        });
                    }
                } else {
                     if(grid) grid.innerHTML = '<p style="color:#666; font-style:italic; grid-column: 1/-1;">Items coming soon...</p>';
                }
            });

            // Initial Time Check
            updateMenuAvailability();

        } catch (error) {
            console.error("Menu Load Failed", error);
            statusMsg.textContent = "Menu Offline";
            document.querySelectorAll('.menu-grid').forEach(g => g.innerHTML = "<p>Could not load menu.</p>");
        }
    }

    // --- 6. SLIDESHOW ---
    function startSlideshow(images) {
        const container = document.querySelector('.slideshow-container');
        if(!container || !images.length) return;

        container.innerHTML = '';
        images.forEach((url, i) => {
            const d = document.createElement('div');
            d.classList.add('slide');
            if(i === 0) d.classList.add('active');
            d.style.backgroundImage = `url('${url}')`;
            container.appendChild(d);
        });

        let idx = 0;
        const slides = document.querySelectorAll('.slide');
        if(slides.length > 1) {
            setInterval(() => {
                slides[idx].classList.remove('active');
                idx = (idx + 1) % slides.length;
                slides[idx].classList.add('active');
            }, 5000); // 5 seconds per slide
        }
    }
    
    // Load Slideshow
    fetch('slideshow.json')
        .then(res => res.json())
        .then(data => startSlideshow(data))
        .catch(() => startSlideshow(['https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'])); 

    // Initialize Menu
    loadAndRenderMenu();
});