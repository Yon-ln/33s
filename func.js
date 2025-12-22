document.addEventListener('DOMContentLoaded', () => {
    
    // --- API CONFIG ---
    const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net";
    const MENU_URL = `${API_BASE}/api/menu`;

    // --- 1. SLIDESHOW ---
    function startSlideshow() {
        const images = [
            'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80', 
            'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1574966739987-65e38db0f7ce?auto=format&fit=crop&q=80'
        ];
        const container = document.querySelector('.hero-bg-slideshow');
        if(!container) return;
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
        setInterval(() => {
            slides[idx].classList.remove('active');
            idx = (idx + 1) % slides.length;
            slides[idx].classList.add('active');
        }, 5000);
    }

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

    startSlideshow();
    loadMenu();

    // Scroll Effect
    window.addEventListener('scroll', () => {
        if(window.scrollY > 50) document.body.classList.add('scrolled');
        else document.body.classList.remove('scrolled');
    });
});