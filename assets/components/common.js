// --- CONFIGURATION ---
const CONFIG = {
    // 1. Define both options
    AZURE_URL: "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net",
    LOCAL_URL: "https://localhost:7176",
    
    // 2. Default to Azure initially
    API_BASE: "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net",

    // Dynamic getters for your endpoints
    get MENU_URL() { return `${this.API_BASE}/api/menu`; },
    get HERO_URL() { return `${this.API_BASE}/api/hero`; },
    get UPLOAD_URL() { return `${this.API_BASE}/api/upload`; },
    
    CATEGORIES: ['Brunch', 'Coffees', 'Pastries', 'Cocktails', 'Wines', 'Beers', 'Dinner', 'Softs', 'Whiskey', 'Gin', 'Rum', 'Brandy']
};

CONFIG.init = (async function checkBackendHealth() {
    console.log("🏥 Checking Azure Health...");
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second max

        const response = await fetch(`${CONFIG.AZURE_URL}/api/hero`, { 
            method: 'GET',
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Azure Error: ${response.status}`);
        console.log("✅ Azure is Online.");

    } catch (error) {
        console.warn(`⚠️ Azure failed (${error.message}). Switching to LOCALHOST.`);
        CONFIG.API_BASE = CONFIG.LOCAL_URL;
        console.log(`🔄 New API_BASE: ${CONFIG.API_BASE}`);
    }
})();


// --- API HELPER (Same as before) ---
const API = {
    async get(url) {
        // ... (rest of your existing API code)
        try {
            const response = await fetch(`${url}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`GET failed for ${url}:`, error);
            return null;
        }
    },
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());
            return true;
        } catch (error) {
            alert(`Error: ${error.message}`);
            return false;
        }
    },
    async put(url, data) {
         try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(await response.text());
            return true;
        } catch (error) {
            alert(`Error: ${error.message}`);
            return false;
        }
    },
    async upload(file, itemName) {
        const formData = new FormData();
        formData.append('file', file, `${itemName}.png`);
        formData.append('itemName', itemName);

        try {
            const res = await fetch(CONFIG.UPLOAD_URL, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Upload rejected");
            const data = await res.json();
            return data.url || data.imageUrl || data.link;
        } catch (error) {
            throw error;
        }
    },
    async delete(url, id) {
        if (!confirm("Are you sure?")) return false;
        try {
            const res = await fetch(`${url}/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
};

// --- DOM HELPERS ---
const DOM = {
    generateCategoryOptions(currentCat) {
        return CONFIG.CATEGORIES.map(cat => 
            `<option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>`
        ).join('');
    }
};