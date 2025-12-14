// 1. CONFIGURATION
const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net/api"; 
const MENU_URL = `${API_BASE}/menu`;
const UPLOAD_URL = `${API_BASE}/Upload`;

// 2. STATE VARIABLES
let menuData = [];
let cropper = null;           
let finalCroppedFile = null;  

// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();

    // Event Listener: Form Submit (ID matched to your HTML)
    document.getElementById('item-form').addEventListener('submit', handleFormSubmit);

    // Event Listener: File Input (ID matched to your HTML)
    document.getElementById('item-image-file').addEventListener('change', handleFileSelect);

    // Event Listener: Crop Confirm Button
    document.getElementById('btn-crop-confirm').addEventListener('click', handleCropConfirm);
    
    // Note: Your "Add" and "Cancel" buttons use onclick="..." in HTML, 
    // so we don't need addEventListener here.
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

// 5. RENDER ITEMS (Updated to use your CSS Grid & Cards!)
function renderItems(items) {
    const grid = document.getElementById('admin-grid'); // ID matched
    grid.innerHTML = ''; 

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card'; 
        
        const validLink = item.imageUrl || item.image;
        const displayImg = (validLink && validLink.trim() !== "") 
            ? validLink 
            : 'https://via.placeholder.com/300?text=No+Image';

        div.innerHTML = `
            
            <div class="card-body">
                <div class="card-header">
                    <h3 class="card-title">${item.name}</h3>
                    <span class="card-price">£${item.price}</span>
                </div>
                <p class="card-desc">${item.description || ''}</p>
                
                <img src="${displayImg}" class="card-img" alt="${item.name}">
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="window.openModal(${item.id})" style="flex:1">Edit</button>
                    <button class="btn btn-danger" onclick="window.deleteItem(${item.id})">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// --- MODAL & CROPPER FUNCTIONS ---

// 6. HANDLE FILE SELECTION
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const imageElement = document.getElementById('image-to-crop');
        
        imageElement.src = url;
        document.getElementById('cropper-modal').style.display = 'flex'; // Show modal

        if (cropper) cropper.destroy();

        cropper = new Cropper(imageElement, {
            aspectRatio: 1, 
            viewMode: 1,
        });
    }
    // Clear the input so selecting the same file triggers 'change' again
    e.target.value = ''; 
}

// 7. HANDLE CROP CONFIRM
function handleCropConfirm() {
    if (!cropper) return;

    cropper.getCroppedCanvas({
        width: 500, 
        height: 500
    }).toBlob((blob) => {
        finalCroppedFile = blob; 
        
        // Show preview in form
        document.getElementById('preview-img').src = URL.createObjectURL(blob);
        document.getElementById('cropper-modal').style.display = 'none';
    });
}

// 8. OPEN MODAL (Global window function for onclick)
window.openModal = function(id = null) {
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('item-form');

    finalCroppedFile = null; 
    document.getElementById('item-image-file').value = ""; 

    if (id) {
        // EDIT MODE
        const item = menuData.find(i => i.id === id);
        if (!item) return;

        title.innerText = "Edit Item";
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-desc').value = item.description;
        document.getElementById('item-price').value = item.price; 
        document.getElementById('item-category').value = item.category;
        
        const validLink = item.imageUrl || item.image || "";
        document.getElementById('item-image-url').value = validLink;
        document.getElementById('preview-img').src = validLink;

    } else {
        // ADD MODE
        title.innerText = "Add New Item";
        form.reset();
        document.getElementById('item-id').value = "";
        document.getElementById('preview-img').src = "";
    }

    modal.classList.add('open'); // Use your CSS class .open
};

window.closeModal = function() {
    document.getElementById('item-modal').classList.remove('open');
};

window.clearImage = function() {
    document.getElementById('item-image-url').value = "";
    document.getElementById('preview-img').src = "";
    finalCroppedFile = null;
};

// --- SUBMIT LOGIC ---

// 9. HANDLE FORM SUBMIT
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('item-id').value;
    const nameInput = document.getElementById('item-name').value;
    let finalImageUrl = document.getElementById('item-image-url').value;

    // A. UPLOAD IMAGE (If cropped file exists)
    if (finalCroppedFile) {
        try {
            finalImageUrl = await uploadImageToBackend(finalCroppedFile, nameInput);
        } catch (err) {
            alert("Image upload failed: " + err.message);
            return;
        }
    }

    // B. PREPARE DATA
    const itemData = {
        id: id ? parseInt(id) : 0,
        name: nameInput,
        description: document.getElementById('item-desc').value,
        price: document.getElementById('item-price').value, 
        category: document.getElementById('item-category').value,
        imageUrl: finalImageUrl, 
        image: finalImageUrl 
    };

    // C. SEND TO API
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${MENU_URL}/${id}` : MENU_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (response.ok) {
            alert(id ? "Saved!" : "Added!");
            closeModal();
            loadMenuItems(); 
        } else {
            alert("Error saving item.");
        }
    } catch (error) {
        console.error(error);
        alert("Network error.");
    }
}

async function uploadImageToBackend(fileBlob, itemName) {
    const formData = new FormData();
    
    // 1. Attach the file (Renaming it to the item name)
    formData.append('file', fileBlob, itemName + ".png"); 
    
    // 2. CRITICAL FIX: Attach the 'itemName' text field that the server requires
    formData.append('itemName', itemName); 

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error("Server rejected upload");
    const data = await res.json();
    return data.url || data.imageUrl || data.link;
}

// 11. DELETE ITEM
window.deleteItem = async function(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${MENU_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) loadMenuItems();
    } catch (error) {
        console.error(error);
    }
};