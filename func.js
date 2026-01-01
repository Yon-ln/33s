document.addEventListener('DOMContentLoaded', () => {
    
    // --- API CONFIG ---
    const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net";
    const MENU_URL = `${API_BASE}/api/menu`;
    const CYCLE_URL = `${API_BASE}/api/hero`;

async function initHeroSlideshow() {
    const container = document.querySelector('.hero-bg-slideshow');
    if (!container) return; // Stop if HTML is missing

    try {
        // 1. Fetch data from Azure
        const response = await fetch(CYCLE_URL);
        
        // Check if the fetch worked
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 2. Clear container and build slides
        container.innerHTML = ''; 

        data.forEach((item, i) => {
            const cycle = document.createElement('div');
            cycle.classList.add('cycle');
            if (i === 0) cycle.classList.add('active');

            // 3. Construct the Full URL correctly
            // If the DB says "uploads/image.png", we make "https://site.net/uploads/image.png"
            const fullImageUrl = `${API_BASE}/${item.imageUrl}`;

            
            cycle.style.backgroundImage = `url('${fullImageUrl}')`;
            container.appendChild(cycle);
        });

        // 4. Start Animation (if more than 1 slide)
        if (data.length > 1) {
            let idx = 0;
            const slides = container.querySelectorAll('.cycle');
            setInterval(() => {
                slides[idx].classList.remove('active');
                idx = (idx + 1) % slides.length;
                slides[idx].classList.add('active');
            }, 5000);
        }

    } catch (error) {
        console.error("Slideshow Failed:", error);
        // Fallback: If API fails, just show a plain color so it doesn't look broken
        container.style.backgroundColor = "#222"; 
    }
}

// Run on load

    // --- 2. INTERACTION (Desktop Tabs + Mobile Accordion) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const accordionHeaders = document.querySelectorAll('.mobile-accordion-header');
    const menuContainers = document.querySelectorAll('.menu-category-container');

    function switchCategory(targetId) {
        // Hide all
        menuContainers.forEach(c => c.classList.remove('active-category'));
        // Show target
        const target = document.getElementById(targetId);
        if(target) target.classList.add('active-category');
        // Update Tabs
        tabButtons.forEach(btn => {
            if(btn.dataset.target === targetId) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    // Desktop Click
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchCategory(btn.dataset.target));
    });

    // Mobile Accordion Click
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target;
            const targetContent = document.getElementById(targetId);
            // Toggle Logic
            if (targetContent.classList.contains('active-category')) {
                targetContent.classList.remove('active-category');
            } else {
                targetContent.classList.add('active-category');
            }
        });
    });

    // --- 3. LOAD MENU DATA ---
    async function loadMenu() {
        try {
            const res = await fetch(`${MENU_URL}?t=${Date.now()}`);
            const data = await res.json();

            // Mapping API Category Names -> HTML IDs
            const map = {
                'Brunch': 'brunch',
                'Cocktails': 'cocktails',
                'Wines': 'wines',
                'Beers': 'beers',
                'Dinner': 'dinner',
                'Softs': 'softs',
                'Coffee': 'coffee',
                'Pastries': 'pastries'
            };

            for (const [apiCat, htmlId] of Object.entries(map)) {
                const container = document.getElementById(htmlId);
                if(!container) continue;

                const listContainer = container.querySelector('.menu-list-side');
                if(!listContainer) continue;

                // Case-insensitive comparison just in case
                const items = data.filter(i => i.category && i.category.trim().toLowerCase() === apiCat.toLowerCase());
                listContainer.innerHTML = '';

                if(items.length) {
                    items.forEach((item, index) => {
                        const div = document.createElement('div');
                        div.classList.add('menu-card');
                        if(index === 0) div.classList.add('highlight-card'); // Highlight first item (Desktop)

                        // Placeholder if no image
                        const imgUrl = item.imageUrl || 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80';

                        div.innerHTML = `
                            <div class="mobile-thumb">
                                <img src="${imgUrl}" alt="${item.name}">
                            </div>
                            <div class="card-text">
                                <h3>${item.name}</h3>
                                <p>${item.description || ''}</p>
                                <span class="price">${item.price}</span>
                            </div>
                        `;
                        listContainer.appendChild(div);
                    });
                } else {
                    listContainer.innerHTML = '<p class="empty-msg">Items coming soon...</p>';
                }
            }

        } catch (e) { console.error("Menu fetch error", e); }
    }

    loadMenu();
    initHeroSlideshow();

    // Scroll Effect
    window.addEventListener('scroll', () => {
        if(window.scrollY > 50) document.body.classList.add('scrolled');
        else document.body.classList.remove('scrolled');
    });
});