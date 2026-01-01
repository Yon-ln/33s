const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net";
const CYCLE_URL = `${API_BASE}/api/hero`;
const UPLOAD_URL = `${API_BASE}/api/upload`;

let heroData = [];
const validCategories = ["Brunch", "Dinner", "Events"];
let cropper = null;
let finalCroppedFile = null;
let editingId = null;

async function loadHeroData() {
    try {
        const response = await fetch(CYCLE_URL);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        heroData = await response.json();

        // Clear grid to prevent duplicates if function runs twice
        const grid = document.getElementById('admin-grid');
        if (grid) grid.innerHTML = '';

        validCategories.forEach(cat => {
            renderHero(getHeroCategory(cat));
        });

    } catch (error) {
        console.error("Loading hero failed", error);
    }
}

function getHeroCategory(category) {
    const filtered = heroData.filter(item => item.category === category);
    return [filtered, category];
}

function nextCycle(container) {
    const images = Array.from(container.querySelectorAll('.hero-img'));
    if (images.length === 0) return;

    const activeIndex = images.findIndex(img => img.classList.contains('active'));

    if (activeIndex !== -1) {
        images[activeIndex].classList.remove('active');
    }

    const nextIndex = (activeIndex + 1) % images.length;
    images[nextIndex].classList.add('active');
}

function renderHero([items, category]) {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;

    const cycle = document.createElement('div');
    cycle.className = 'hero-banner';
    cycle.dataset.category = category;

    const title = document.createElement('h1');
    title.textContent = category;
    title.className = 'hero-h1';
    cycle.appendChild(title);

    // Only render controls if we have items
    if (items && items.length > 0) {
        const btn = document.createElement('button');
        btn.className = 'cycle-button';
        btn.textContent = '➤';
        btn.onclick = () => nextCycle(cycle);
        cycle.appendChild(btn);

        items.forEach((item, i) => {
            const validLink = item.imageUrl;
            const displayImg = (validLink && validLink.trim() !== "")
                ? validLink
                : 'https://via.placeholder.com/300x200?text=No+Image';

            const fullImageUrl = `${API_BASE}/${displayImg}`;

            const img = document.createElement("img");
            img.className = 'hero-img';
            
            if (i === 0) img.classList.add('active');

            img.src = fullImageUrl;
            img.dataset.category = category;

            cycle.appendChild(img);
        });
    }

    grid.appendChild(cycle);
}

loadHeroData();