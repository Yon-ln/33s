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

let currentTargetId = null; // Tracks which item we are editing (null = new item)

document.addEventListener('DOMContentLoaded', async () => {
    await CONFIG.init;

    loadMenuItems();
    initSearchAndFilters();
    
    // Initialize the Crop Manager (defined in crop.js)
    // Callback: When an image is uploaded, update the visual preview and trigger "Edit Mode"
    if (typeof CropManager !== 'undefined') {
        CropManager.init((id, newUrl) => {
            console.log(`Image updated for ID ${id}: ${newUrl}`);
            
            // 1. Update the visual image on the grid immediately
            const imgTag = document.querySelector(`.card[data-id="${id}"] .card-img`);
            const hiddenInput = document.getElementById(`img-${id}`);
            
            if (imgTag) imgTag.src = newUrl;
            if (hiddenInput) hiddenInput.value = newUrl;

            // 2. Trigger the "Save / Cancel" bar on the row
            window.startEdit(id);
            
            // 3. Mark image as modified (optional helper for UI)
            if (imgTag) imgTag.dataset.modified = "true";
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
        const validLink = item.imageUrl || 'assets/placeholder.jpg';
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = item.id; // Helpful for DOM queries
        
        // This structure must EXACTLY match the CSS Grid definition in menu.css
        card.innerHTML = `
            <img src="${validLink}" class="card-img view-img" 
                 onclick="window.openLibrary(${item.id})">
            
            <div class="card-body"> 
                <div class="card-header">
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
                    <button class="btn btn-danger" onclick="window.deleteItem(${item.id})">DEL</button>
                </div>
                
                <div class="inline-actions" id="edit-actions-${item.id}" style="display: none;">
                    <button class="btn btn-primary" onclick="window.saveInlineEdit(${item.id})">SAVE</button>
                    <button class="btn btn-outline" onclick="window.cancelEdit(${item.id})">CANCEL</button>
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

// A. Trigger Image Crop (Native Upload)
// Called when user clicks "Upload New" in the Library modal
window.triggerNativeUpload = function() {
    window.closeLibrary();
    
    if (currentTargetId === 'NEW') {
        document.getElementById('new-item-file').click();
    } else {
        // Trigger the Cropper logic for existing item
        if (typeof CropManager !== 'undefined') {
            CropManager.trigger(currentTargetId);
        }
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
    // Get image URL from hidden input (updated by Library or Cropper)
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
        imageUrl: imgUrl, 
    };

    const success = await API.put(`${CONFIG.MENU_URL}/${id}`, updatedItem);
    
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
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    const success = await API.delete(CONFIG.MENU_URL, id);
    if (success) {
        // Remove from local data
        menuState.data = menuState.data.filter(i => i.id !== id);
        // Remove from DOM
        const card = document.querySelector(`.card[data-id='${id}']`);
        if(card) card.remove();
    }
};

// --- 4. NEW ITEM CREATION (Corrected HTML Structure) ---

window.createNewCard = function() {
    // Prevent multiple creation rows
    if (document.getElementById('new-card-container')) return;

    const grid = document.getElementById('admin-grid');
    const div = document.createElement('div');
    div.className = 'card new-item-mode'; 
    div.id = 'new-card-container';
    div.style.background = "#fff9e6"; // Light yellow to indicate "Draft"

    // We construct the HTML to match the CSS Grid columns exactly:
    // 1. Img | 2. Name | 3. Desc | 4. Cat | 5. Price | 6. Actions
    div.innerHTML = `
        <div class="card-img" onclick="window.openLibrary('NEW')" 
             style="cursor:pointer; background:#eee; display:flex; align-items:center; justify-content:center; border:1px dashed #222;">
            <img id="new-img-preview" style="width:100%; height:100%; object-fit:cover; display:none;">
            <span id="new-plus-sign" style="font-size:1.2rem;">+</span>
        </div>
        <input type="file" id="new-item-file" style="display:none;" accept="image/*">

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
            <button class="btn btn-primary" onclick="window.saveNewItem()" style="font-size:0.7rem;">CREATE</button>
            <button class="btn btn-danger" onclick="window.cancelNewItem()" style="font-size:0.7rem;">CANCEL</button>
        </div>
    `;

    // Insert at the top
    grid.prepend(div);
    
    // Auto-focus the name
    document.getElementById('new-name').focus();
    
    // Handle Image Preview (if manual file upload used instead of library)
    document.getElementById('new-item-file').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            const img = document.getElementById('new-img-preview');
            img.src = url;
            img.style.display = 'block';
            if (img.nextElementSibling) img.nextElementSibling.style.display = 'none'; // Hide "+"
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
    const imgPreview = document.getElementById('new-img-preview');

    if (nameVal === "Item Name..." || !nameVal.trim()) {
        alert("Please enter a name."); return;
    }
    if (!catVal) {
        alert("Please select a category."); return;
    }

    let finalImageUrl = "";

    // 1. Check if they picked from Library
    if (imgPreview.dataset.value) {
        finalImageUrl = imgPreview.dataset.value;
    }
    // 2. Check if they Uploaded a File
    else if (fileInput.files.length > 0) {
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
    };

    // 3. Send to API
    const success = await API.post(CONFIG.MENU_URL, itemData);

    if (success) {
        window.cancelNewItem();
        loadMenuItems(); // Refresh grid
        alert("Item Created!");
    }
};

// --- 5. MEDIA LIBRARY LOGIC ---

window.openLibrary = function(id = null) {
    currentTargetId = id; // Remember who called us (ID or 'NEW')
    
    const modal = document.getElementById('existing-images');
    const grid = document.getElementById('library-grid');
    
    // 1. Harvest Unique Images from current menu data
    // (We use a Set to remove duplicates)
    const uniqueImages = [...new Set(menuState.data.map(item => item.imageUrl))].filter(url => url && url.length > 5);

    // 2. Build the Grid
    grid.innerHTML = '';
    
    if (uniqueImages.length === 0) {
        grid.innerHTML = '<p style="padding:20px; color:#666;">No existing images found.</p>';
    } else {
        uniqueImages.forEach(url => {
            const div = document.createElement('div');
            div.className = 'library-thumb';
            div.onclick = () => window.selectLibraryImage(url);
            
            // Try to extract a clean filename for display
            const filename = url.split('/').pop().split('?')[0].substring(0, 15);
            
            div.innerHTML = `
                <img src="${url}" loading="lazy">
                <span>${filename}...</span>
            `;
            grid.appendChild(div);
        });
    }

    // 3. Show Modal
    modal.style.display = 'flex';
};

window.closeLibrary = function() {
    document.getElementById('existing-images').style.display = 'none';
};

window.selectLibraryImage = function(url) {
    // 1. Close Modal
    window.closeLibrary();

    // 2. Apply Image based on context
    if (currentTargetId === 'NEW') {
        // We are creating a NEW card
        const imgPreview = document.getElementById('new-img-preview');
        const plusSign = document.getElementById('new-plus-sign');
        
        // Update New Card UI
        imgPreview.src = url;
        imgPreview.style.display = 'block';
        imgPreview.dataset.value = url; // Store URL for saving
        if(plusSign) plusSign.style.display = 'none';
        
    } else {
        // We are editing an EXISTING item (ID is a number)
        const imgTag = document.querySelector(`.card[data-id="${currentTargetId}"] .card-img`);
        const hiddenInput = document.getElementById(`img-${currentTargetId}`);

        if (imgTag) imgTag.src = url;
        if (hiddenInput) hiddenInput.value = url;

        // Trigger the "Save/Cancel" UI
        window.startEdit(currentTargetId);
    }
};