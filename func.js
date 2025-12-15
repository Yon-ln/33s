// 1. CONFIGURATION
const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net/api"; 
const MENU_URL = `${API_BASE}/menu`;
const UPLOAD_URL = `${API_BASE}/upload`;

// 2. STATE VARIABLES
let menuData = [];
let cropper = null;           
let finalCroppedFile = null;  

// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();

    // Event Listener: "Add New Item" Form Submit
    document.getElementById('item-form').addEventListener('submit', handleFormSubmit);

    // Event Listener: File Input (Trigger Cropper)
    document.getElementById('item-image-file').addEventListener('change', handleFileSelect);

    // Event Listener: Crop Confirm Button
    document.getElementById('btn-crop-confirm').addEventListener('click', handleCropConfirm);
});

// --- CORE FUNCTIONS ---

// 4. LOAD ITEMS
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

// 5. RENDER ITEMS (With Inline Editing)
function renderItems(items) {
    const grid = document.getElementById('admin-grid'); 
    grid.innerHTML = ''; 

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card'; 
        
        const validLink = item.imageUrl || item.image;
        const displayImg = (validLink && validLink.trim() !== "") 
            ? validLink 
            : 'https://via.placeholder.com/300?text=No+Image';

        div.innerHTML = `
            <img src="${displayImg}" class="card-img" alt="${item.name}">
            <div class="card-body">
                
                <div class="card-header">
                    <h3 class="card-title editable-field" 
                        id="name-${item.id}"
                        onclick="startEdit(${item.id})">
                        ${item.name}
                    </h3>

                    <span class="card-price">
                        £<span class="editable-field" 
                               id="price-${item.id}"
                               onclick="startEdit(${item.id})">${item.price}</span>
                    </span>
                </div>

                <p class="card-desc editable-field" 
                   id="desc-${item.id}"
                   onclick="startEdit(${item.id})">
                   ${item.description || 'Click to add description...'}
                </p>

                <input type="hidden" id="cat-${item.id}" value="${item.category}">
                <input type="hidden" id="img-${item.id}" value="${validLink}">

                <div class="card-actions" id="std-actions-${item.id}">
                    <button class="btn btn-danger" onclick="window.deleteItem(${item.id})" style="width:100%">Delete Item</button>
                </div>

                <div class="inline-actions" id="edit-actions-${item.id}">
                    <button class="btn btn-primary" onclick="saveInlineEdit(${item.id})" style="flex:1">Save</button>
                    <button class="btn btn-outline" onclick="cancelEdit(${item.id})" style="flex:1">Cancel</button>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// --- INLINE EDITING FUNCTIONS ---

// A. Turn on Edit Mode
window.startEdit = function(id) {
    const nameField = document.getElementById(`name-${id}`);
    const priceField = document.getElementById(`price-${id}`);
    const descField = document.getElementById(`desc-${id}`);
    
    // Make editable
    nameField.contentEditable = "true";
    priceField.contentEditable = "true";
    descField.contentEditable = "true";

    // Toggle Buttons
    document.getElementById(`std-actions-${id}`).style.display = 'none'; 
    document.getElementById(`edit-actions-${id}`).style.display = 'flex'; 
    
    nameField.focus(); // Focus on name immediately
};

// B. Cancel Edit Mode
window.cancelEdit = function(id) {
    const originalItem = menuData.find(i => i.id === id);
    if (!originalItem) return;

    // Reset Text
    document.getElementById(`name-${id}`).innerText = originalItem.name;
    document.getElementById(`price-${id}`).innerText = originalItem.price;
    document.getElementById(`desc-${id}`).innerText = originalItem.description || 'Click to add description...';

    disableEditMode(id);
};

// C. Save Changes (PUT)
window.saveInlineEdit = async function(id) {
    const newName = document.getElementById(`name-${id}`).innerText.trim();
    const newPrice = document.getElementById(`price-${id}`).innerText.trim();
    const newDesc = document.getElementById(`desc-${id}`).innerText.trim();
    
    const category = document.getElementById(`cat-${id}`).value;
    const imageUrl = document.getElementById(`img-${id}`).value;

    if (!newName || !newPrice) {
        alert("Name and Price are required.");
        return;
    }

    const itemData = {
        id: id,
        name: newName,
        price: newPrice, 
        description: newDesc === 'Click to add description...' ? '' : newDesc,
        category: category,
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
            // Update local data
            const index = menuData.findIndex(i => i.id === id);
            if (index !== -1) menuData[index] = itemData;
            
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

    document.getElementById(`std-actions-${id}`).style.display = 'block';
    document.getElementById(`edit-actions-${id}`).style.display = 'none';
}

// --- MODAL & CROPPER (For Adding New Items) ---

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const imageElement = document.getElementById('image-to-crop');
        
        imageElement.src = url;
        document.getElementById('cropper-modal').style.display = 'flex';

        if (cropper) cropper.destroy();

        cropper = new Cropper(imageElement, {
            aspectRatio: 1, 
            viewMode: 1,
        });
    }
    e.target.value = ''; 
}

function handleCropConfirm() {
    if (!cropper) return;

    cropper.getCroppedCanvas({ width: 500, height: 500 }).toBlob((blob) => {
        finalCroppedFile = blob; 
        document.getElementById('preview-img').src = URL.createObjectURL(blob);
        document.getElementById('cropper-modal').style.display = 'none';
    });
}

// Open "Add New" Modal
window.openModal = function() {
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');

    // Reset everything for a fresh "Add"
    finalCroppedFile = null; 
    form.reset();
    document.getElementById('item-id').value = ""; // No ID means create new
    document.getElementById('preview-img').src = "";
    document.getElementById('item-image-url').value = "";

    modal.classList.add('open');
};

window.closeModal = function() {
    document.getElementById('item-modal').classList.remove('open');
};

window.clearImage = function() {
    document.getElementById('item-image-url').value = "";
    document.getElementById('preview-img').src = "";
    finalCroppedFile = null;
};

// --- SUBMIT LOGIC (For "Add New") ---

async function handleFormSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById('item-name').value;
    let finalImageUrl = document.getElementById('item-image-url').value;

    // 1. Upload Image if new file exists
    if (finalCroppedFile) {
        try {
            finalImageUrl = await uploadImageToBackend(finalCroppedFile, nameInput);
        } catch (err) {
            alert("Image upload failed: " + err.message);
            return;
        }
    }

    // 2. Prepare Data (Only for Creation now, since Edit is inline)
    const itemData = {
        name: nameInput,
        description: document.getElementById('item-desc').value,
        price: document.getElementById('item-price').value, 
        category: document.getElementById('item-category').value,
        imageUrl: finalImageUrl, 
        image: finalImageUrl 
    };

    // 3. POST Request
    try {
        const response = await fetch(MENU_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (response.ok) {
            alert("Item Added!");
            closeModal();
            loadMenuItems(); 
        } else {
            alert("Error adding item.");
        }
    } catch (error) {
        console.error(error);
        alert("Network error.");
    }
}

async function uploadImageToBackend(fileBlob, itemName) {
    const formData = new FormData();
    formData.append('file', fileBlob, itemName + ".png"); 
    formData.append('itemName', itemName); // Fix for backend requirement

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error("Server rejected upload");
    const data = await res.json();
    return data.url || data.imageUrl || data.link;
}

// --- DELETE LOGIC ---
window.deleteItem = async function(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${MENU_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) loadMenuItems();
    } catch (error) {
        console.error(error);
    }
};