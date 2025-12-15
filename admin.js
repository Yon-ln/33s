// 1. CONFIGURATION
const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net/api"; 
const MENU_URL = `${API_BASE}/menu`;
const UPLOAD_URL = `${API_BASE}/upload`;

// 2. STATE VARIABLES
let menuData = [];
let cropper = null;           
let finalCroppedFile = null; 
let editingId = null; // Tracks if we are editing an existing image

// The list of categories for your dropdowns
const CATEGORIES = ['Brunch', 'Coffees', 'Pastries', 'Cocktails', 'Wines', 'Beers', 'Dinner', 'Softs', 'Whiskey', 'Gin', 'Rum', 'Brandy'];

// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();
    
    // Setup "List View" Toggle Button
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) {
        // Prevent duplicate buttons if script runs twice
        if (!document.getElementById('view-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'view-toggle-btn';
            toggleBtn.innerText = "Switch to Grid View";
            toggleBtn.onclick = toggleListView;
            headerTitle.appendChild(toggleBtn);
        }
    }

    // Setup "Add New Item" Button
    const addBtn = document.querySelector('.btn-primary'); 
    if(addBtn) {
        addBtn.onclick = (e) => {
            e.preventDefault(); 
            createNewCard();
        };
    }

    // Global Cropper Listeners
    const cropConfirmBtn = document.getElementById('btn-crop-confirm');
    if (cropConfirmBtn) {
        cropConfirmBtn.addEventListener('click', handleCropConfirm);
    }
    
    // Global File Input Listener (For editing existing images)
    const globalInput = document.getElementById('item-image-file');
    if(globalInput) {
        globalInput.addEventListener('change', handleFileSelect);
    }
});

// --- CORE FUNCTIONS ---

async function loadMenuItems() {
    try {
        const response = await fetch(`${MENU_URL}?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to load menu");
        menuData = await response.json();
        renderItems(menuData);
    } catch (error) {
        console.error("Error loading items:", error);
    }
}

function getCategoryOptions(currentCat) {
    return CATEGORIES.map(cat => 
        `<option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>`
    ).join('');
}

// 4. TOGGLE VIEW MODE
window.toggleListView = function() {
    const grid = document.getElementById('admin-grid');
    const btn = document.getElementById('view-toggle-btn');
    
    grid.classList.toggle('list-mode');

    if (grid.classList.contains('list-mode')) {
        btn.innerText = "Switch to Grid View";
    } else {
        btn.innerText = "Switch to List View";
    }
};

// 5. RENDER ITEMS
function renderItems(items) {
    const grid = document.getElementById('admin-grid'); 
    grid.innerHTML = ''; 

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card'; 
        
        const validLink = item.imageUrl || item.image;
        const displayImg = (validLink && validLink.trim() !== "") 
            ? validLink 
            : 'https://via.placeholder.com/300x200?text=No+Image';

        div.innerHTML = `
            <img src="${displayImg}" class="card-img" alt="${item.name}" 
                 onclick="triggerImageEdit(${item.id})" 
                 title="Click to change image">
            
            <div class="card-body">
                
                <div class="card-header">
                    <h3 class="card-title editable-field" 
                        id="name-${item.id}"
                        onclick="startEdit(${item.id}, 'name-${item.id}')">
                        ${item.name}
                    </h3>

                    <span class="card-price">
                        <span class="editable-field" 
                               id="price-${item.id}"
                               onclick="startEdit(${item.id}, 'price-${item.id}')">${item.price}</span>
                    </span>
                </div>

                <div class="list-cat-wrapper">
                    <span class="card-cat-display editable-field" 
                          id="cat-display-${item.id}"
                          onclick="startEdit(${item.id}, 'cat-edit-${item.id}')">
                          ${item.category || 'Uncategorized'}
                    </span>
                    <select id="cat-edit-${item.id}" 
                            style="display:none; padding: 5px; width: 100%; margin-bottom:10px;">
                        ${getCategoryOptions(item.category)}
                    </select>
                </div>

                <p class="card-desc editable-field" 
                   id="desc-${item.id}"
                   onclick="startEdit(${item.id}, 'desc-${item.id}')">
                   ${item.description || 'Click to add description...'}
                </p>

                <input type="hidden" id="img-${item.id}" value="${validLink}">

                <div class="card-actions" id="std-actions-${item.id}">
                    <button class="btn btn-danger" onclick="window.deleteItem(${item.id})" style="width:100%">Delete</button>
                </div>

                <div class="inline-actions" id="edit-actions-${item.id}" style="display: none;">
                    <button class="btn btn-primary" onclick="saveInlineEdit(${item.id})" style="flex:1">Save</button>
                    <button class="btn btn-outline" onclick="cancelEdit(${item.id})" style="flex:1">Cancel</button>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// --- NEW ITEM CREATION (PHANTOM CARD) ---

window.createNewCard = function() {
    if (document.getElementById('new-card-container')) {
        document.getElementById('new-card-container').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const grid = document.getElementById('admin-grid');
    const div = document.createElement('div');
    div.className = 'card new-item-mode'; 
    div.id = 'new-card-container';

    div.innerHTML = `
        <div class="upload-placeholder" onclick="triggerNewItemUpload()">
            <span id="new-upload-text">📸 Click to Add Image</span>
            <img id="new-img-preview" style="width:100%; height:100%; object-fit:cover; display:none;">
        </div>
        <input type="file" id="new-item-file" style="display:none;" accept="image/*">

        <div class="card-body">
            <div class="card-header">
                <h3 class="card-title" contenteditable="true" id="new-name">Item Name...</h3>
                <span class="card-price">
                    <span contenteditable="true" id="new-price">0.00</span>
                </span>
            </div>

            <select id="new-cat" style="padding: 5px; width: 100%; margin-bottom:10px;">
                <option value="" disabled selected>Select Category...</option>
                ${getCategoryOptions('')}
            </select>

            <p class="card-desc" contenteditable="true" id="new-desc">Description...</p>

            <div class="inline-actions" style="display:flex; margin-top:auto;">
                <button class="btn btn-primary" onclick="saveNewItem()" style="flex:1">Create</button>
                <button class="btn btn-danger" onclick="cancelNewItem()" style="flex:1">Cancel</button>
            </div>
        </div>
    `;

    grid.prepend(div);
    
    document.getElementById('new-item-file').addEventListener('change', handleNewFileSelect);
    
    // Focus and select text
    const nameField = document.getElementById('new-name');
    nameField.focus();
    // Select all text in the contenteditable
    const range = document.createRange();
    range.selectNodeContents(nameField);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
};

window.cancelNewItem = function() {
    const card = document.getElementById('new-card-container');
    if(card) card.remove();
    finalCroppedFile = null; 
};

window.saveNewItem = async function() {
    const nameVal = document.getElementById('new-name').innerText;
    const priceVal = document.getElementById('new-price').innerText;
    const descVal = document.getElementById('new-desc').innerText;
    const catVal = document.getElementById('new-cat').value;

    if (nameVal === "Item Name..." || !nameVal.trim()) {
        alert("Please enter a name."); return;
    }
    if (!catVal) {
        alert("Please select a category."); return;
    }

    let finalImageUrl = "";

    if (finalCroppedFile) {
        try {
            finalImageUrl = await uploadImageToBackend(finalCroppedFile, nameVal);
        } catch (err) {
            alert("Image upload failed: " + err.message);
            return;
        }
    }

    const itemData = {
        name: nameVal.trim(),
        description: descVal === "Description..." ? "" : descVal.trim(),
        price: priceVal.trim(),
        category: catVal,
        imageUrl: finalImageUrl,
        image: finalImageUrl
    };

    try {
        const response = await fetch(MENU_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (response.ok) {
            cancelNewItem();
            loadMenuItems();
            alert("Item Created!");
        } else {
            alert("Error: " + await response.text());
        }
    } catch (error) {
        console.error(error);
        alert("Network Error");
    }
};

// --- IMAGE HANDLING (NEW & EXISTING) ---

// 1. Trigger Edit for EXISTING items
window.triggerImageEdit = function(id) {
    editingId = id; 
    const fileInput = document.getElementById('item-image-file');
    if(fileInput) fileInput.click(); 
};

// 2. Trigger Upload for NEW items
window.triggerNewItemUpload = function() {
    editingId = null;
    const fileInput = document.getElementById('new-item-file');
    if(fileInput) fileInput.click();
};

// 3. Handle File Selection (Global & New)
function handleFileSelect(e) { handleGenericFileSelect(e); }
function handleNewFileSelect(e) { handleGenericFileSelect(e); }

function handleGenericFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const imageElement = document.getElementById('image-to-crop');
        
        imageElement.src = url;
        document.getElementById('cropper-modal').style.display = 'flex';

        if (cropper) cropper.destroy();
        cropper = new Cropper(imageElement, { aspectRatio: 1, viewMode: 1 });
    }
    e.target.value = ''; 
}

// 4. Handle Crop Confirm
async function handleCropConfirm() {
    if (!cropper) return;

    cropper.getCroppedCanvas({ width: 500, height: 500 }).toBlob(async (blob) => {
        finalCroppedFile = blob; 
        
        // CASE A: Editing EXISTING item
        if (editingId !== null) {
            try {
                // Upload immediately for existing items
                const newUrl = await uploadImageToBackend(blob, "Update_" + editingId);
                
                // Update hidden input
                const hiddenInput = document.getElementById(`img-${editingId}`);
                if(hiddenInput) {
                    hiddenInput.value = newUrl;
                    // Update visual image
                    const cardDiv = hiddenInput.closest('.card');
                    const imgTag = cardDiv.querySelector('.card-img');
                    if(imgTag) imgTag.src = newUrl;
                }
                alert("Image Updated! Click 'Save' to persist.");
            } catch(e) {
                alert("Upload failed: " + e.message);
            }
            editingId = null;
        } 
        
        // CASE B: Creating NEW item
        else {
            const newPreview = document.getElementById('new-img-preview');
            const newText = document.getElementById('new-upload-text');
            if (newPreview) {
                newPreview.src = URL.createObjectURL(blob);
                newPreview.style.display = 'block';
                if(newText) newText.style.display = 'none';
            }
        }
        
        document.getElementById('cropper-modal').style.display = 'none';
    });
}

// --- EXISTING INLINE EDITING LOGIC ---

window.startEdit = function(id, fieldIdToFocus) {
    document.getElementById(`name-${id}`).contentEditable = "true";
    document.getElementById(`price-${id}`).contentEditable = "true";
    document.getElementById(`desc-${id}`).contentEditable = "true";

    document.getElementById(`cat-display-${id}`).style.display = 'none';
    document.getElementById(`cat-edit-${id}`).style.display = 'block';

    document.getElementById(`std-actions-${id}`).style.display = 'none'; 
    document.getElementById(`edit-actions-${id}`).style.display = 'flex'; 
    
    if (fieldIdToFocus) {
        const field = document.getElementById(fieldIdToFocus);
        if(field) field.focus();
    }
};

window.cancelEdit = function(id) {
    const originalItem = menuData.find(i => i.id === id);
    if (!originalItem) return;

    document.getElementById(`name-${id}`).innerText = originalItem.name;
    document.getElementById(`price-${id}`).innerText = originalItem.price;
    document.getElementById(`desc-${id}`).innerText = originalItem.description || 'Click to add description...';

    document.getElementById(`cat-display-${id}`).style.display = 'inline-block';
    document.getElementById(`cat-edit-${id}`).style.display = 'none';
    document.getElementById(`cat-edit-${id}`).value = originalItem.category;

    disableEditMode(id);
};

window.saveInlineEdit = async function(id) {
    const newName = document.getElementById(`name-${id}`).innerText.trim();
    const newPrice = document.getElementById(`price-${id}`).innerText.trim();
    const newDesc = document.getElementById(`desc-${id}`).innerText.trim();
    const newCategory = document.getElementById(`cat-edit-${id}`).value;
    const imageUrl = document.getElementById(`img-${id}`).value;

    if (!newName || !newPrice) {
        alert("Name and Price are required."); return;
    }

    const itemData = {
        id: id,
        name: newName,
        price: newPrice, 
        description: newDesc === 'Click to add description...' ? '' : newDesc,
        category: newCategory,
        imageUrl: imageUrl,
        image: imageUrl
    };

    try {
        const response = await fetch(`${MENU_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (response.ok) {
            const index = menuData.findIndex(i => i.id === id);
            if (index !== -1) menuData[index] = itemData;

            document.getElementById(`cat-display-${id}`).innerText = newCategory;
            document.getElementById(`cat-display-${id}`).style.display = 'inline-block';
            document.getElementById(`cat-edit-${id}`).style.display = 'none';
            disableEditMode(id);
        } else {
            alert("Error saving: " + await response.text());
        }
    } catch (error) {
        console.error(error);
        alert("Network error.");
    }
};

function disableEditMode(id) {
    document.getElementById(`name-${id}`).contentEditable = "false";
    document.getElementById(`price-${id}`).contentEditable = "false";
    document.getElementById(`desc-${id}`).contentEditable = "false";

    document.getElementById(`std-actions-${id}`).style.display = 'block'; // Make default visible
    document.getElementById(`edit-actions-${id}`).style.display = 'none';
}

async function uploadImageToBackend(fileBlob, itemName) {
    const formData = new FormData();
    formData.append('file', fileBlob, itemName + ".png"); 
    formData.append('itemName', itemName); 
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Server rejected upload");
    const data = await res.json();
    return data.url || data.imageUrl || data.link;
}

window.deleteItem = async function(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${MENU_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) loadMenuItems();
    } catch (error) {
        console.error(error);
        alert("Failed to delete item.");
    }
};