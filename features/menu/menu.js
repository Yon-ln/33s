// --- AUTH GUARD ---
(function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    // If no token exists, kick them out to the login page
    if (!token) {
        window.location.href = 'login.html';
    }
    
    // Optional: You should also attach this token to your API calls
    // so the server knows who you are.
})();

// --- STATE MANAGEMENT ---
let menuState = {
    data: [], // Stores the full list of items from API
};

document.addEventListener('DOMContentLoaded', async () => {
    await CONFIG.init;

    loadMenuItems();
    initSearchAndFilters();
    
    // Initialize the Crop Manager (defined in crop.js)
    // Callback: When an image is uploaded, auto-save the item to persist the new URL
    if (typeof CropManager !== 'undefined') {
        CropManager.init((id, newUrl) => {
            // Optional: You can auto-save immediately, or just let the user click "Save"
            console.log(`Image updated for ID ${id}: ${newUrl}`);
            // If you want to auto-save the text fields + new image immediately:
            // window.saveInlineEdit(id); 
            window.startEdit(id);
        });
    } else {
        console.warn("CropManager not found. Image editing will not work.");
    }
});

// --- 1. DATA LOADING & RENDERING ---

async function loadMenuItems() {
    const data = await API.get(CONFIG.MENU_URL);
    if (data) {
        menuState.data = data;
        renderItems(data);
    }
}

function renderItems(items) {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    items.forEach(item => {
        const validLink = item.imageUrl || 'placeholder.jpg';
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = item.id; // Helpful for DOM queries
        
        card.innerHTML = `
    <img src="${validLink}" class="card-img view-img" 
         onclick="window.triggerImageEdit(${item.id})">
    
    <div class="card-body"> <div class="card-header">
            <h3 class="card-title editable-field view-name" 
                id="name-${item.id}" 
                onclick="window.startEdit(${item.id})">${item.name}</h3>
            
            <span class="card-price view-price">
                <span class="editable-field" id="price-${item.id}" onclick="window.startEdit(${item.id})">${item.price}</span>
            </span>
        </div>
        
        <p class="card-desc editable-field view-desc" 
           id="desc-${item.id}" 
           onclick="window.startEdit(${item.id})">${item.description || '...'}</p>
        
        <div class="list-cat-wrapper view-cat">
            <span id="cat-display-${item.id}" class="card-cat-display" onclick="window.startEdit(${item.id})">${item.category || 'Uncategorized'}</span>
            <select id="cat-edit-${item.id}" style="display:none;">${DOM.generateCategoryOptions(item.category)}</select>
        </div>

        <input type="hidden" id="img-${item.id}" value="${validLink}">

        <div class="card-actions" id="std-actions-${item.id}">
            <button class="btn btn-danger" onclick="window.deleteItem(${item.id})">Del</button>
        </div>
        
        <div class="inline-actions" id="edit-actions-${item.id}" style="display: none;">
            <button class="btn btn-primary" onclick="window.saveInlineEdit(${item.id})">Save</button>
            <button class="btn btn-outline" onclick="window.cancelEdit(${item.id})">Cancel</button>
        </div>
    </div>
`;
        grid.appendChild(card);
    });
}

// --- 2. SEARCH & VIEW CONTROLS ---

function initSearchAndFilters() {
    // A. Search Bar
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = menuState.data.filter(item => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const cat  = (item.category || '').toLowerCase();
                return name.includes(term) || desc.includes(term) || cat.includes(term);
            });
            renderItems(filtered);
        });
    }

    // B. Show/Hide Checkboxes
    const toggles = document.querySelectorAll('.view-toggle');
    toggles.forEach(box => {
        // Apply initial state
        updateView(box);
        box.addEventListener('change', () => updateView(box));
    });
}

function updateView(checkbox) {
    const grid = document.getElementById('admin-grid');
    if(!grid) return;
    const classToToggle = checkbox.dataset.toggle; // e.g., 'hide-img'

    if (checkbox.checked) {
        grid.classList.remove(classToToggle);
    } else {
        grid.classList.add(classToToggle);
    }
}

// --- 3. GLOBAL WINDOW ACTIONS (For HTML onclick events) ---

// A. Trigger Image Crop
window.triggerImageEdit = function(id) {
    if (typeof CropManager !== 'undefined') {
        CropManager.trigger(id);
    } else {
        alert("CropManager is missing!");
    }
};

// B. Start Inline Edit
window.startEdit = function(id) {
    // Enable Content Editable
    ['name', 'price', 'desc'].forEach(field => {
        const el = document.getElementById(`${field}-${id}`);
        if(el) el.contentEditable = "true";
    });

    // Show Dropdown / Hide Label
    document.getElementById(`cat-display-${id}`).style.display = 'none';
    document.getElementById(`cat-edit-${id}`).style.display = 'block';
    
    // Toggle Buttons
    document.getElementById(`std-actions-${id}`).style.display = 'none'; 
    document.getElementById(`edit-actions-${id}`).style.display = 'flex'; 
};

// C. Cancel Edit
window.cancelEdit = function(id) {
    const original = menuState.data.find(i => i.id === id);
    if (!original) return;
    
    // Revert Text
    document.getElementById(`name-${id}`).innerText = original.name;
    document.getElementById(`price-${id}`).innerText = original.price;
    document.getElementById(`desc-${id}`).innerText = original.description || 'Click to add description...';
    
    // UI Reset
    document.getElementById(`cat-display-${id}`).style.display = 'inline-block';
    document.getElementById(`cat-edit-${id}`).style.display = 'none';
    document.getElementById(`cat-edit-${id}`).value = original.category; // Reset dropdown selection
    
    document.getElementById(`std-actions-${id}`).style.display = 'block'; 
    document.getElementById(`edit-actions-${id}`).style.display = 'none';
    
    // Disable Editable
    ['name', 'price', 'desc'].forEach(field => {
        const el = document.getElementById(`${field}-${id}`);
        if(el) el.contentEditable = "false";
    });
};

// D. Save Inline Edit
window.saveInlineEdit = async function(id) {
    const nameVal = document.getElementById(`name-${id}`).innerText.trim();
    const priceVal = document.getElementById(`price-${id}`).innerText.trim();
    const imgUrl = document.getElementById(`img-${id}`).value;
    
    if (!nameVal || !priceVal) {
        alert("Name and Price cannot be empty.");
        return;
    }

    const updatedItem = {
        id: id,
        name: nameVal,
        price: priceVal,
        description: document.getElementById(`desc-${id}`).innerText.trim(),
        category: document.getElementById(`cat-edit-${id}`).value,
        imageUrl: imgUrl, // <--- Send the new cropped image URL    
    };

    const success = await API.put(`${CONFIG.MENU_URL}/${id}`, updatedItem);
    
    // If API.post only handles POST, you might need a specific PUT:
    // const res = await fetch(`${CONFIG.MENU_URL}/${id}`, { method: 'PUT', ... })
    // For this example, assuming API.post sends JSON correctly:
    
    if (success) {
        // Update local state to match
        const index = menuState.data.findIndex(i => i.id === id);
        if (index !== -1) menuState.data[index] = updatedItem;

        // Reset UI
        window.cancelEdit(id); 
        
        // Update the visual category label manually so we don't need to re-render
        document.getElementById(`cat-display-${id}`).innerText = updatedItem.category;
    }
};

// E. Delete Item
window.deleteItem = async function(id) {
    const success = await API.delete(CONFIG.MENU_URL, id);
    if (success) {
        // Remove from local data
        menuState.data = menuState.data.filter(i => i.id !== id);
        // Remove from DOM
        const card = document.querySelector(`.card[data-id='${id}']`);
        if(card) card.remove();
    }
};

// --- 4. NEW ITEM CREATION ---

window.createNewCard = function() {
    // Prevent multiple creation rows
    if (document.getElementById('new-card-container')) return;

    const grid = document.getElementById('admin-grid');
    const div = document.createElement('div');
    div.className = 'card new-item-mode'; 
    div.id = 'new-card-container';
    div.style.background = "#fff9e6"; // Light yellow to indicate "Draft"

    // We construct the HTML to match the CSS Grid columns:
    // 1. Img | 2. Name | 3. Desc | 4. Cat | 5. Price | 6. Actions
    div.innerHTML = `
        <label class="card-img" style="cursor:pointer; background:#eee; display:flex; align-items:center; justify-content:center; border:1px dashed #222;">
            <span style="font-size:1.2rem;">+</span>
            <input type="file" id="new-item-file" style="display:none;" accept="image/*">
            <img id="new-img-preview" style="width:100%; height:100%; object-fit:cover; display:none;">
        </label>

        <div class="card-title" contenteditable="true" id="new-name" 
             style="border-bottom:1px dashed #999; color:#444;">Item Name...</div>

        <div class="card-desc" contenteditable="true" id="new-desc" 
             style="border-bottom:1px dashed #999;">Description...</div>

        <div class="list-cat-wrapper" style="grid-column: 4; grid-row: 1; align-self: center;">
            <select id="new-cat" style="width:100%; padding: 5px; font-size: 0.8rem;">
                <option value="" disabled selected>Select...</option>
                ${DOM.generateCategoryOptions('')}
            </select>
        </div>

        <div class="card-price" contenteditable="true" id="new-price" 
             style="border-bottom:1px dashed #999;">0.00</div>

        <div class="card-actions" style="display:flex; gap:5px;">
            <button class="btn btn-primary" onclick="window.saveNewItem()" style="font-size:0.7rem;">SAVE</button>
            <button class="btn btn-danger" onclick="window.cancelNewItem()" style="font-size:0.7rem;">X</button>
        </div>
    `;

    // Insert at the top
    grid.prepend(div);
    
    // Auto-focus the name
    document.getElementById('new-name').focus();
    
    // Handle Image Preview
    document.getElementById('new-item-file').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            const img = document.getElementById('new-img-preview');
            img.src = url;
            img.style.display = 'block';
            this.previousElementSibling.style.display = 'none'; // Hide the "+" sign
        }
    });
};

window.cancelNewItem = function() {
    const card = document.getElementById('new-card-container');
    if(card) card.remove();
};

window.saveNewItem = async function() {
    const nameVal = document.getElementById('new-name').innerText;
    const priceVal = document.getElementById('new-price').innerText;
    const catVal = document.getElementById('new-cat').value;
    const fileInput = document.getElementById('new-item-file');

    if (nameVal === "Item Name..." || !nameVal.trim()) {
        alert("Please enter a name."); return;
    }
    if (!catVal) {
        alert("Please select a category."); return;
    }

    let finalImageUrl = "";

    // 1. Upload Image if exists
    if (fileInput.files.length > 0) {
        try {
            // Using API.upload from utils.js
            finalImageUrl = await API.upload(fileInput.files[0], nameVal);
        } catch (err) {
            alert("Image upload failed: " + err.message);
            return;
        }
    }

    // 2. Prepare Data
    const itemData = {
        name: nameVal.trim(),
        description: document.getElementById('new-desc').innerText === "Description..." ? "" : document.getElementById('new-desc').innerText,
        price: priceVal.trim(),
        category: catVal,
        imageUrl: finalImageUrl,
        image: finalImageUrl
    };

    // 3. Send to API
    const success = await API.post(CONFIG.MENU_URL, itemData);

    if (success) {
        window.cancelNewItem();
        loadMenuItems(); // Refresh grid
        alert("Item Created!");
    }
};