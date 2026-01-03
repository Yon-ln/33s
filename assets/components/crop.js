// Dependency: Requires 'utils.js' (for API & CONFIG) and 'cropper.js' library
const CropManager = {
    cropper: null,
    editingId: null,    // Tracks which item ID we are editing
    onSuccess: null,    // Callback function to run after upload finishes

    /**
     * 1. INITIALIZE LISTENERS
     * Call this once in your page's DOMContentLoaded
     * @param {Function} successCallback - (Optional) Function to run after successful upload
     */
    init(successCallback = null) {
        if (successCallback) this.onSuccess = successCallback;

        // Listener: File Input Change
        const fileInput = document.getElementById('item-image-file');
        if (fileInput) {
            // Remove old listeners to be safe, then add new one
            const newSocket = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newSocket, fileInput);
            newSocket.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Listener: Confirm Button
        const confirmBtn = document.getElementById('btn-crop-confirm');
        if (confirmBtn) {
            // Remove old listeners, add new one
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.addEventListener('click', () => this.confirmCrop());
        }

        // Listener: Cancel Button (Optional, if you have one inside the modal)
        const cancelBtn = document.querySelector('#cropper-modal .btn-outline');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
    },

    /**
     * 2. START THE PROCESS
     * Call this when the user clicks an image to edit
     */
    trigger(id) {
        this.editingId = id;
        const fileInput = document.getElementById('item-image-file');
        if (fileInput) fileInput.click();
    },

    /**
     * 3. HANDLE FILE SELECTION (Internal)
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const imgElement = document.getElementById('image-to-crop');
            
            // Setup Image
            imgElement.src = url;
            
            // Show Modal
            document.getElementById('cropper-modal').style.display = 'flex';

            // Init Cropper
            if (this.cropper) this.cropper.destroy();
            this.cropper = new Cropper(imgElement, { 
                aspectRatio: 1, // Change to NaN if you want free crop
                viewMode: 1 
            });
        }
        e.target.value = ''; // Reset input so same file can be selected again
    },

    /**
     * 4. CONFIRM CROP & UPLOAD (Internal)
     */
    confirmCrop() {
        if (!this.cropper) return;

        // Get 500x500 canvas
        this.cropper.getCroppedCanvas({ width: 500, height: 500 }).toBlob(async (blob) => {
            
            try {
                // Determine Filename (New Item vs Existing)
                const filename = this.editingId 
                    ? `Update_${this.editingId}` 
                    : `New_Item_${Date.now()}`;

                // Upload via your Utils API
                const newUrl = await API.upload(blob, filename);

                // Handle Success
                if (this.editingId) {
                    // Update the Hidden Input
                    const hiddenInput = document.getElementById(`img-${this.editingId}`);
                    if (hiddenInput) hiddenInput.value = newUrl;

                    // Update the Visual Image
                    const cardImg = document.querySelector(`.card-img[onclick*="${this.editingId}"]`);
                    if (cardImg) cardImg.src = newUrl;
                }

                this.closeModal();
                alert("Image Uploaded Successfully");

                // Run the specific page logic (e.g., saveInlineEdit)
                if (this.onSuccess && this.editingId) {
                    this.onSuccess(this.editingId, newUrl);
                }

            } catch (error) {
                console.error(error);
                alert("Upload Failed: " + error.message);
            }
        });
    },

    closeModal() {
        document.getElementById('cropper-modal').style.display = 'none';
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    }
};