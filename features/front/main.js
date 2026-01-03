document.addEventListener('DOMContentLoaded', async () => {
    // 1. Wait for check
    await CONFIG.init;

    // 2. Load components
    initHeroSlideshow();
    initMenuTabs();
    loadFrontMenu();
    initScrollEffect();

    const logoLink = document.getElementById('logo-login');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault(); // Stop the default jump
                
                const token = localStorage.getItem('authToken');
                
                if (token) {
                    // If they have a token, assume they are admin
                    window.location.href = 'menu.html';
                } else {
                    // If no token, send to login
                    window.location.href = 'login.html';
                }
            });
        }
});

// 1. HERO SLIDESHOW
async function initHeroSlideshow() {
    const container = document.querySelector('.hero-bg-slideshow');
    if (!container) return;

    const data = await API.get(CONFIG.HERO_URL);
    if (!data) {
        container.style.backgroundColor = "#222"; 
        return;
    }

    container.innerHTML = ''; 

    data.forEach((item, i) => {
        const cycle = document.createElement('div');
        cycle.className = `cycle ${i === 0 ? 'active' : ''}`;
        
        // Use full URL
        const fullUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${CONFIG.API_BASE}/${item.imageUrl}`;
        cycle.style.backgroundImage = `url('${fullUrl}')`;
        
        container.appendChild(cycle);
    });

    if (data.length > 1) {
        let idx = 0;
        const slides = container.querySelectorAll('.cycle');
        setInterval(() => {
            slides[idx].classList.remove('active');
            idx = (idx + 1) % slides.length;
            slides[idx].classList.add('active');
        }, 5000);
    }
}

// 2. INTERACTION (Tabs/Accordion)
function initMenuTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const menuContainers = document.querySelectorAll('.menu-category-container');

    // Desktop Click
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            
            // UI Updates
            menuContainers.forEach(c => c.classList.remove('active-category'));
            document.getElementById(targetId)?.classList.add('active-category');

            tabButtons.forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
        });
    });

    // Mobile Logic... (kept brief for clarity)
    document.querySelectorAll('.mobile-accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            document.getElementById(header.dataset.target)?.classList.toggle('active-category');
        });
    });
}

// 3. LOAD MENU DATA (Interactive & Revamped)
async function loadFrontMenu() {
    const data = await API.get(CONFIG.MENU_URL);
    if (!data) return;

    const map = {
        'Brunch': 'brunch', 'Cocktails': 'cocktails',
        'Dinner': 'dinner', 'Wines': 'wines',
        'Beers' : 'beers', 'Softs' : 'softs',
        'Coffees' : 'coffee', 'Pastries' : 'pastries'
    };

    for (const [apiCat, htmlId] of Object.entries(map)) {
        const container = document.getElementById(htmlId);
        if(!container) continue;

        const listContainer = container.querySelector('.menu-list-side');
        const bigImageElement = container.querySelector('.menu-image-side img'); // Target the desktop image
        
        if(!listContainer) continue;

        // Filter items
        const items = data.filter(i => i.category?.toLowerCase() === apiCat.toLowerCase());
        listContainer.innerHTML = '';

        if(items.length) {
            // 1. Set Default Image (First item in list)
            if (bigImageElement) {
                const firstImg = items[0].imageUrl || 'assets/placeholder.jpg'; // Fallback
                bigImageElement.src = firstImg;
                bigImageElement.style.opacity = '1';
            }

            // 2. Build the List
            items.forEach((item, index) => {
                const imgUrl = item.imageUrl || 'placeholder.jpg';
                
                // Create the DOM element manually so we can add Event Listeners
                const card = document.createElement('div');
                card.className = `menu-card ${index === 0 ? 'active-item' : ''}`;
                
                // New "Revamped" Layout Structure
                card.innerHTML = `
                    <div class="mobile-thumb"><img src="${imgUrl}" alt="${item.name}"></div>
                    <div class="card-details">
                        <div class="card-header-row">
                            <h3 class="item-name">${item.name}</h3>
                            <span class="dotted-line"></span>
                            <span class="item-price">${item.price}</span>
                        </div>
                        <p class="item-desc">${item.description || ''}</p>
                    </div>
                `;

                // 3. Add Hover Interaction (Desktop Only)
                card.addEventListener('mouseenter', () => {
                    // Update highlight class
                    listContainer.querySelectorAll('.menu-card').forEach(c => c.classList.remove('active-item'));
                    card.classList.add('active-item');

                    // Update Big Image with Fade effect
                    if (bigImageElement) {
                        bigImageElement.style.opacity = '0.8'; // Slight dim triggers transition
                        setTimeout(() => {
                            bigImageElement.src = imgUrl;
                            bigImageElement.style.opacity = '1';
                        }, 50);
                    }
                });

                listContainer.appendChild(card);
            });
        }
    }
}

function initScrollEffect() {
    window.addEventListener('scroll', () => {
        document.body.classList.toggle('scrolled', window.scrollY > 50);
    });
}