// --- 1. CONFIGURATION ---
// Update these if your URL changes
const API_BASE = "https://33stheoldgrocery-beh6a0dmhufqbaf4.ukwest-01.azurewebsites.net/";
const MENU_URL = `${API_BASE}/api/menu`;
const UPLOAD_URL = `${API_BASE}/api/Upload`; // Note: Controller is usually capitalized in route by default, but verify.

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', loadItems);

// --- 3. LOAD & RENDER ITEMS ---
async function loadItems() {
    const grid = document.getElementById('admin-grid');
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading menu items...</p>';
    
    try {
        const res = await fetch(MENU_URL);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        
        grid.innerHTML = ''; // Clear loading message
        
        if (data.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">No items found. Add one!</p>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Use a placeholder if image is missing/empty
            const imgUrl = (item.image && item.image.trim() !== "") 
                ? item.image 
                : 'https://via.placeholder.com/300?text=No+Image';

            // Escape quotes for the onclick JSON
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

            card.innerHTML = `
                <img src="${imgUrl}" class="card-img" alt="${item.name}">
                <div class="card-body">
                    <div class="card-header">
                        <h3 class="card-title">${item.name}</h3>
                        <span class="card-price">$${item.price}</span>
                    </div>
                    <p class="card-desc">
                        <strong>${item.category}</strong> <br> 
                        ${item.description || ''}
                    </p>
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="openModal(${itemJson})">Edit</button>
                        <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = `<p style="color:red; text-align:center;">Error loading menu: ${e.message}</p>`;
        console.error(e);
    }
}

// --- 4. MODAL FUNCTIONS ---
const modal = document.getElementById('item-modal');
const form = document.getElementById('item-form');
const previewImg = document.getElementById('preview-img');

function openModal(item = null) {
    modal.classList.add('open');
    if (item) {
        // Edit Mode
        document.getElementById('modal-title').innerText = "Edit Item";
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-desc').value = item.description || "";
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-category').value = item.category || "";
        document.getElementById('item-image-url').value = item.image || "";
        previewImg.src = item.image || "";
    } else {
        // Create Mode
        document.getElementById('modal-title').innerText = "New Item";
        form.reset();
        document.getElementById('item-id').value = ""; // Clear hidden ID
        document.getElementById('item-image-url').value = "";
        previewImg.src = "";
    }
}

function closeModal() {
    modal.classList.remove('open');
}

// Close modal if clicking outside the white box
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// Clear image helper
function clearImage() {
    document.getElementById('item-image-file').value = ""; // Clear file input
    document.getElementById('item-image-url').value = ""; // Clear hidden URL string
    previewImg.src = "";
}

// Instant Preview when selecting a file (local only)
document.getElementById('item-image-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (e) => previewImg.src = e.target.result;
        reader.readAsDataURL(file);
    }
});

// --- 5. SAVE ITEM (CREATE OR UPDATE) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button to prevent double-clicks
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const id = document.getElementById('item-id').value;
    const nameInput = document.getElementById('item-name').value;
    const fileInput = document.getElementById('item-image-file');
    
    let finalImageUrl = document.getElementById('item-image-url').value;

    try {
        // STEP A: Handle Image Upload (If a new file was selected)
        if (fileInput.files.length > 0) {
            // pass the Name so backend can rename the file (e.g. burger_123.jpg)
            finalImageUrl = await uploadImageToBackend(fileInput.files[0], nameInput);
        }

        // STEP B: Prepare Data Object
        // Ensure numbers are actually numbers
        const itemData = {
            id: id ? parseInt(id) : 0,
            name: nameInput,
            description: document.getElementById('item-desc').value,
            price: parseFloat(document.getElementById('item-price').value),
            category: document.getElementById('item-category').value,
            image: finalImageUrl
        };

        // STEP C: Send to API
        const method = id ? 'PUT' : 'POST';
        // PUT usually needs ID in URL: /api/menu/5
        const url = id ? `${MENU_URL}/${id}` : MENU_URL;

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Server responded with error.");
        }

        // Success!
        closeModal();
        loadItems(); // Refresh the grid

    } catch (err) {
        alert("Failed to save: " + err.message);
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

// --- 6. DELETE ITEM ---
async function deleteItem(id) {
    if(!confirm("Are you sure you want to delete this item? This cannot be undone.")) return;
    
    try {
        const res = await fetch(`${MENU_URL}/${id}`, { method: 'DELETE' });
        
        if(res.ok) {
            loadItems();
        } else {
            alert("Could not delete item. Check console.");
        }
    } catch (err) {
        console.error(err);
        alert("Delete failed.");
    }
}

// --- 7. IMAGE UPLOAD HELPER ---
async function uploadImageToBackend(file, itemName) {
    const formData = new FormData();
    formData.append('file', file);
    // Send the item name so the C# controller can use it for the filename
    formData.append('itemName', itemName || "menuItem"); 

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    // Expecting backend to return { url: "..." }
    return data.url; 
}