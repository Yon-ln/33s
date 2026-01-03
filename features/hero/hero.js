const HERO_STATE = {
    data: [],
    categories: ["Brunch", "Dinner", "Events"]
};

loadHeroData();

async function loadHeroData() {
    const data = await API.get(CONFIG.HERO_URL);
    if(data) {
        HERO_STATE.data = data;
        const grid = document.getElementById('admin-grid');
        if(grid) grid.innerHTML = ''; // Clear only if we are in hero mode
        
        HERO_STATE.categories.forEach(cat => renderHeroCategory(cat));
    }
}

function renderHeroCategory(category) {
    const items = HERO_STATE.data.filter(item => item.category === category);
    const grid = document.getElementById('admin-grid');

    const cycle = document.createElement('div');
    cycle.className = 'hero-banner';
    cycle.innerHTML = `<h1 class="hero-h1">${category}</h1>`;

    if (items.length > 0) {
        // Create "Next" Button
        const btn = document.createElement('button');
        btn.className = 'cycle-button';
        btn.textContent = '➤';
        btn.onclick = () => window.cycleHeroImages(cycle); // Use window function
        cycle.appendChild(btn);

        items.forEach((item, i) => {
            const img = document.createElement("img");
            img.className = `hero-img ${i === 0 ? 'active' : ''}`;
            img.src = item.imageUrl.startsWith('http') ? item.imageUrl : `${CONFIG.API_BASE}/${item.imageUrl}`;
            cycle.appendChild(img);
        });
    }
    grid.appendChild(cycle);
}

// Make globally accessible for the onclick event
window.cycleHeroImages = function(container) {
    const images = Array.from(container.querySelectorAll('.hero-img'));
    if (images.length === 0) return;

    const activeIndex = images.findIndex(img => img.classList.contains('active'));
    if (activeIndex !== -1) images[activeIndex].classList.remove('active');

    const nextIndex = (activeIndex + 1) % images.length;
    images[nextIndex].classList.add('active');
};