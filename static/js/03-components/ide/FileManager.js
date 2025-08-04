class FileManager {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`File manager container not found: ${containerSelector}`);
        }

        this.options = {
            enableSelection: true,
            enableMultiSelect: true,
            ...options
        };

        // Store reference to IDEController if provided
        this.ideController = options.ideController || null;

        // State
        this.selectedFiles = [];
        this.activeFile = null;
        this.rootFolder = this.container.querySelector('.folder[data-is-root="true"]'); // Folder where new files will be created
        this.parentFolder = this.container.querySelector('.folder[data-is-root="true"]'); // Folder where new files will be created
        this.setParentFolder(this.parentFolder);
        // Initialize
        this.init();
    }

    /**
     * Initialize file manager
     */
    init() {
        try {
            this.setupEventListeners();
            this.setupToolbarHandlers();
        } catch (error) {
        }
    }

    getParentFolder(fileElement) {
        return fileElement.closest('.folder');
    }
    setParentFolder(folderElement) {
        // Remove previous focused folder styling
        if (this.parentFolder) {
            const prevFolderName = this.parentFolder.querySelector('.folder-name');
            if (prevFolderName) {
                prevFolderName.classList.remove('folder-focused');
            }
        }
        this.parentFolder = folderElement;
        // Add focused folder styling
        if (folderElement) {
            const folderName = folderElement.querySelector('.folder-name');
            if (folderName) {
                folderName.classList.add('folder-focused');
            }
        }
    }

    toggleFolder(folderElement) {
        const isRetracted = folderElement.classList.contains('retracted');
        
        if (isRetracted) {
            // Expand folder
            folderElement.classList.remove('retracted');
        } else {
            // Collapse folder
            folderElement.classList.add('retracted');
        }

    }


    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle file clicks for selection
        this.container.addEventListener('click', (e) => {
            const fileElement = e.target.closest('.file');
            const folderElement = e.target.closest('.folder');

            const arrowElement = e.target.closest('.arrow');
            
            if (arrowElement){
                this.toggleFolder(folderElement);
            }
            else if (fileElement || folderElement) {
                this.handleFileClick(e, fileElement || folderElement);
            }
            else {
                console.log('Clicked on unhandled element:', e.target);
            }
        });

        // Set up drag and drop for folders and files
        this.setupDragAndDrop();
    }

    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
        // Make folders and files draggable
        this.container.addEventListener('mousedown', (e) => {
            const draggableElement = e.target.closest('.file, .folder');
            if (draggableElement && !e.target.closest('.arrow')) {
                draggableElement.draggable = true;
            }
        });

        // Drag start
        this.container.addEventListener('dragstart', (e) => {
            const draggedElement = e.target.closest('.file, .folder');
            if (!draggedElement) return;

            // Don't allow dragging root folder
            if (draggedElement.dataset.isRoot === 'true') {
                e.preventDefault();
                return;
            }

            e.dataTransfer.setData('text/plain', ''); // Required for Firefox
            e.dataTransfer.effectAllowed = 'move';
            
            // Store dragged element info
            this.draggedElement = draggedElement;
            draggedElement.classList.add('dragging');
        });

        // Drag over folders (to show drop zones)
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const folder = e.target.closest('.folder');
            if (folder && folder !== this.draggedElement) {
                e.dataTransfer.dropEffect = 'move';
                folder.classList.add('drop-target');
            }
        });

        // Drag leave folders
        this.container.addEventListener('dragleave', (e) => {
            const folder = e.target.closest('.folder');
            if (folder) {
                folder.classList.remove('drop-target');
            }
        });

        // Drop
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetFolder = e.target.closest('.folder');
            
            if (targetFolder && this.draggedElement && targetFolder !== this.draggedElement) {
                this.handleDrop(this.draggedElement, targetFolder);
            }
            
            // Clean up
            this.cleanupDrag();
        });

        // Drag end
        this.container.addEventListener('dragend', (e) => {
            this.cleanupDrag();
        });
    }

    /**
     * Handle dropping an item into a folder
     */
    async handleDrop(draggedElement, targetFolder) {
        const targetFolderId = targetFolder.dataset.folderId;
        
        // Determine which items to move
        let itemsToMove = [];
        
        if (this.selectedFiles.length > 0 && this.selectedFiles.includes(draggedElement)) {
            // If dragged element is part of selection, move all selected items
            itemsToMove = [...this.selectedFiles];
        } else {
            // Otherwise, just move the dragged element
            itemsToMove = [draggedElement];
        }

        // Validate all items before moving any
        for (const item of itemsToMove) {
            const itemType = item.dataset.type;
            
            // Don't allow moving root folder
            if (item.dataset.isRoot === 'true') {
                this.showMessage('Cannot move root folder', 'warning');
                return;
            }
            
            // Don't allow dropping folder into itself or its children
            if (itemType === 'folder' && this.isDescendantOf(targetFolder, item)) {
                this.showMessage('Cannot move folder into itself or its children', 'warning');
                return;
            }
            
            // Don't allow dropping into the same parent
            const currentParent = item.closest('.folder');
            if (currentParent === targetFolder) {
                this.showMessage('Items are already in this folder', 'warning');
                return;
            }
        }

        // Move all valid items
        let successCount = 0;
        let failCount = 0;
        
        for (const item of itemsToMove) {
            const itemType = item.dataset.type;
            const itemId = itemType === 'folder' ? item.dataset.folderId : item.dataset.id;
            
            try {
                const response = await fetch(`/zettelkasten/zettel/${itemType}/${itemId}/move/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify({ 
                        target_folder_id: targetFolderId 
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Move the element in the DOM
                    const targetContent = targetFolder.querySelector(':scope > .folder-content');
                    if (targetContent) {
                        targetContent.appendChild(item);
                        successCount++;
                    } else {
                        // If target doesn't have content area, reload
                        window.location.reload();
                        return;
                    }
                } else {
                    console.error(`Failed to move ${itemType}:`, data.error);
                    failCount++;
                }
            } catch (error) {
                console.error(`Error moving ${itemType}:`, error.message);
                failCount++;
            }
        }

        // Show summary message
        if (successCount > 0 && failCount === 0) {
            const itemText = successCount === 1 ? 'item' : 'items';
            this.showMessage(`Moved ${successCount} ${itemText} successfully`, 'success');
        } else if (successCount > 0 && failCount > 0) {
            this.showMessage(`Moved ${successCount} items, ${failCount} failed`, 'warning');
        } else {
            this.showMessage(`Failed to move items`, 'fail');
        }

        // Reorder the target folder and source folders to maintain proper ordering
        this.reorderFolderContents(targetFolder);
        
        // Also reorder the source folders (where items were moved from)
        const sourceFolders = new Set();
        itemsToMove.forEach(item => {
            const sourceFolder = item.closest('.folder');
            if (sourceFolder && sourceFolder !== targetFolder) {
                sourceFolders.add(sourceFolder);
            }
        });
        sourceFolders.forEach(folder => this.reorderFolderContents(folder));

        // Clear selection after move
        this.clearFileSelection();
    }

    /**
     * Reorder items in a folder: folders first, then zettels, then files (alphabetically within each group)
     */
    reorderFolderContents(folderElement) {
        const folderContent = folderElement.querySelector(':scope > .folder-content');
        if (!folderContent) return;

        // Get all direct children
        const allItems = Array.from(folderContent.children);
        
        // Separate items by type
        const folders = allItems.filter(item => item.dataset.type === 'folder');
        const zettels = allItems.filter(item => item.dataset.type === 'zettel');
        const files = allItems.filter(item => item.dataset.type === 'file');

        // Sort each group alphabetically by name
        const sortByName = (a, b) => {
            const nameA = a.querySelector('.folder-name p')?.textContent.toLowerCase() || '';
            const nameB = b.querySelector('.folder-name p')?.textContent.toLowerCase() || '';
            return nameA.localeCompare(nameB);
        };

        folders.sort(sortByName);
        zettels.sort(sortByName);
        files.sort(sortByName);

        // Remove all items from DOM
        allItems.forEach(item => item.remove());

        // Add them back in correct order: folders, zettels, files
        [...folders, ...zettels, ...files].forEach(item => {
            folderContent.appendChild(item);
        });
    }

    /**
     * Recursively reorder all folder contents in the tree
     */
    reorderAllFolders() {
        const allFolders = this.container.querySelectorAll('.folder');
        allFolders.forEach(folder => {
            this.reorderFolderContents(folder);
        });
    }

    /**
     * Check if target is a descendant of source folder
     */
    isDescendantOf(target, source) {
        let current = target.parentElement;
        while (current && current !== this.container) {
            if (current === source) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    /**
     * Clean up drag and drop state
     */
    cleanupDrag() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
            this.draggedElement.draggable = false;
            this.draggedElement = null;
        }
        
        // Remove all drop target highlights
        this.container.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
    }


    /**
     * Handle file click with selection logic
     */
    handleFileClick(e, fileElement) {
        e.stopPropagation();

        if (e.ctrlKey) {
            this.selectFile(fileElement);
        } else if (e.shiftKey && this.activeFile) {
            this.selectRange(fileElement);
        } else {
            // Normal click: Single selection
            this.clearFileSelection();
            this.selectFile(fileElement);
            if (fileElement.dataset.type === 'zettel') {
                this.activeFile = fileElement;
                this.emit('file-manager:fileSelected', fileElement);
            }
            if (fileElement.dataset.type === 'folder') {
                this.setParentFolder(fileElement);
            }
            else {
                this.setParentFolder(this.getParentFolder(fileElement));
            }
        }
    }

    handleFolderClick(e, folderElement) {
        if (e.ctrlKey){
            this.selectFile(folderElement);
        }
    }

    selectRange(fileElement) {
        if (!this.activeFile) return;

        const allFiles = Array.from(this.container.querySelectorAll('.file, .folder'));
        const startIndex = allFiles.indexOf(this.activeFile);
        const endIndex = allFiles.indexOf(fileElement);

        if (startIndex === -1 || endIndex === -1) return;

        const rangeStart = Math.min(startIndex, endIndex);
        const rangeEnd = Math.max(startIndex, endIndex);

        this.clearFileSelection();
        
        for (let i = rangeStart; i <= rangeEnd; i++) {
            this.selectFile(allFiles[i]);
        }
    }





    selectFile(fileElement) {
        if (this.selectedFiles.includes(fileElement)) {
            // Deselect file
            fileElement.classList.remove('file-selected');
            this.selectedFiles = this.selectedFiles.filter(f => f !== fileElement);
        } else {
            // Select file
            fileElement.classList.add('file-selected');
            this.selectedFiles.push(fileElement);
        }
        console.log('Selected files:', this.selectedFiles.map(f => {
           if (f.dataset.type === 'zettel') {
               return 'zettel ' + `${f.dataset.id}`;
           }
           else if (f.dataset.type === 'folder') {
               return 'folder ' + `${f.dataset.folderId}`;
           }
           else if (f.dataset.type === 'file') {
               return 'file ' + `${f.dataset.id}`;
           }
            return f.dataset.id;
        }));
    }

    clearFileSelection() {
        this.selectedFiles.forEach(file => file.classList.remove('file-selected'));
        this.selectedFiles = [];
    }



    setupToolbarHandlers() {
        const toolbar = this.container.querySelector('.tool-bar-container');
        if (!toolbar) return;
        
        // Set up search input listener
        const searchInput = toolbar.querySelector('#find-input');
        if (searchInput) {
            // Listen for input events (real-time search as user types)
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                this.handleSearch(this.rootFolder, query);
            });
        }
        
        // Get all toolbar items
        const toolbarItems = toolbar.querySelectorAll('.tool-bar-item');
        toolbarItems.forEach((item, index) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Get the action based on title attribute or index
                const title = item.getAttribute('title');
                const action = title?.toLowerCase().replace(/\s+/g, '_');
                
                
                switch(action) {
                    case 'new_zettel':
                        this.handleNewFile();
                        break;
                    case 'new_folder':
                        this.handleNewFolder();
                        break;
                    case 'upload':
                        this.handleUploadFiles();
                        break;
                    case 'upload_folder':
                        this.handleUploadFolder();
                        break;
                    case 'download_folder':
                        this.handleDownloadFolder();
                        break;
                    case 'search':
                        this.handleSearch();
                        break;
                    case 'rename':
                        this.handleRename();
                        break;
                    case 'delete':
                        this.handleDelete();
                        break;
                    default:
                        console.log('Unknown toolbar action:', action);
                }
            });
        });
    }

    // Toolbar action handlers
    async handleNewFile() {
        const folderId = this.parentFolder.dataset.folderId;

        try {
            const response = await fetch(`/zettelkasten/zettel/${folderId}/create_zettel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(`Created file: ${data.name}`, 'success');

                // Create and add the new file element to the DOM
                

                this.addNewFileToDOM(data.id, data.name);

            } else {
                this.showMessage(`Failed to create file: ${data.error}`, 'fail');
            }
        } catch (error) {
            this.showMessage(`Error creating file: ${error.message}`, 'fail');
        }
    }

    async handleNewFolder() {
        const folderId = this.parentFolder.dataset.folderId;

        try {
            const response = await fetch(`/zettelkasten/zettel/${folderId}/create_folder/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(`Created folder: ${data.name}`, 'success');

                // Create and add the new folder element to the DOM
                this.addNewFolderToDOM(data.id, data.name);

            } else {
                this.showMessage(`Failed to create folder: ${data.error}`, 'fail');
            }
        } catch (error) {
            this.showMessage(`Error creating folder: ${error.message}`, 'fail');
        }


       
    }


    // Separate method for files only
    handleUploadFiles() {
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.multiple = true;
        // NO webkitdirectory = allows file selection only
        uploadInput.style.display = 'none';

        uploadInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length === 0) {
                this.showMessage('No files selected for upload', 'warning');
                return;
            }

            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
                formData.append('file_paths', file.name); // Just filename for individual files
            }
            
            formData.append('folder_id', this.parentFolder.dataset.folderId);
            formData.append('has_folder_structure', false);

            // Same upload logic as before...
            this.uploadToServer(formData);
        });

        document.body.appendChild(uploadInput);
        uploadInput.click();
        document.body.removeChild(uploadInput);
    }

    // Separate method for folders only
    handleUploadFolder() {
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.multiple = true;
        uploadInput.webkitdirectory = true; // Enables folder selection
        uploadInput.style.display = 'none';

        uploadInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length === 0) {
                this.showMessage('No folder selected for upload', 'warning');
                return;
            }

            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
                formData.append('file_paths', file.webkitRelativePath);
            }
            
            formData.append('folder_id', this.parentFolder.dataset.folderId);
            formData.append('has_folder_structure', true);

            // Same upload logic as before...
            this.uploadToServer(formData);
        });

        document.body.appendChild(uploadInput);
        uploadInput.click();
        document.body.removeChild(uploadInput);
    }

    // Extract common upload logic
    async uploadToServer(formData) {
        try {
            const response = await fetch('/zettelkasten/zettel/upload/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                const hasFolderStructure = formData.get('has_folder_structure') === 'true';
                const uploadType = hasFolderStructure ? 'folder structure' : 'files';
                this.showMessage(`Uploaded ${uploadType} with ${data.files.length} files`, 'success');
                
                // Reorder all folders instead of reloading
                this.reorderAllFolders();
            } else {
                this.showMessage(`Failed to upload: ${data.error}`, 'fail');
            }
        } catch (error) {
            this.showMessage(`Error uploading: ${error.message}`, 'fail');
        }
    }


    handleDownloadFolder() {
        if (this.selectedFiles.length !== 1) {
            this.showMessage('Please select exactly one folder to download', 'warning');
            return;
        }

        const folderElement = this.selectedFiles[0];
        
        // Check if selected item is actually a folder
        if (folderElement.dataset.type !== 'folder') {
            this.showMessage('Please select a folder to download', 'warning');
            return;
        }
        
        const folderId = folderElement.dataset.folderId;
        
        if (!folderId) {
            this.showMessage('Invalid folder selected', 'error');
            return;
        }

        // Trigger the download by redirecting to the download URL
        window.location.href = `/zettelkasten/zettel/${folderId}/download/`;
    }

    handleSearch(folderElement, query){
        // Get direct children only (not descendants)
        const files = folderElement.querySelectorAll(':scope > .folder-content > .file');
        const subFolders = folderElement.querySelectorAll(':scope > .folder-content > .folder');

        let hideThisFolder = true;
        
        // If query is empty, show everything
        if (query === '') {
            hideThisFolder = false;
        }

        // Check files in this folder
        files.forEach(file => {
            const nameElement = file.querySelector('.folder-name p');
            const fileName = nameElement ? nameElement.textContent.toLowerCase() : '';
            
            if (fileName.includes(query.toLowerCase())) {
                file.classList.remove('file-not-found');
                hideThisFolder = false; // If any file matches, don't hide this folder
            } else {
                file.classList.add('file-not-found');
            }
        });

        // Check subfolders recursively
        subFolders.forEach(subFolder => {
            const nameElement = subFolder.querySelector(':scope > .folder-name p');
            const subFolderName = nameElement ? nameElement.textContent.toLowerCase() : '';
            
            // Recursively search the subfolder
            const shouldHideSubFolder = this.handleSearch(subFolder, query);
            
            // If subfolder name matches or subfolder contains matches, show it
            if (subFolderName.includes(query.toLowerCase()) || !shouldHideSubFolder) {
                subFolder.classList.remove('file-not-found');
                hideThisFolder = false; // If any subfolder is visible, don't hide this folder
            } else {
                subFolder.classList.add('file-not-found');
            }
        });

        return hideThisFolder;
    }

    async handleRename() {
        if (this.selectedFiles.length !== 1) {
            this.showMessage('Please select exactly one file or folder to rename', 'warning');
            return;
        }

        //if root folder is selected, do nothing
        if (this.selectedFiles[0].dataset.isRoot === "true") {
            this.showMessage('Cannot rename root folder', 'warning');
            return;
        }
        
        const fileElement = this.selectedFiles[0];
        const itemType = fileElement.dataset.type;
        const itemId = itemType === 'folder' ? fileElement.dataset.folderId : fileElement.dataset.id;

        let oldName = fileElement.querySelector('.folder-name p').textContent;
        let extName = '';
        if (itemType == 'file') {
            //replace file extention
            extName = oldName.split('.').pop();
            oldName = oldName.split('.')[0];
        }

        let newName = prompt(`Enter new name for ${itemType}:`, oldName );
        if (!newName) {
            return; // User cancelled
        }

        if (itemType === 'file') {
            // Ensure new name has proper file extension
            newName += `.${extName}`;
            console.log('New file name:', newName);
        }
        try {
            const response = await fetch(`/zettelkasten/zettel/${itemType}/${itemId}/update_name/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ new_name: newName })
            });

            const data = await response.json();

            if (data.success) { 
                this.showMessage(`Renamed ${itemType} to: ${newName}`, 'success');

                // Update the file/folder name in the DOM
                const nameElement = fileElement.querySelector('.folder-name p');
                if (nameElement) {
                    nameElement.textContent = data.name;
                }
            }
            else {
                this.showMessage(`Failed to rename ${itemType}: ${data.error}`, 'fail');
            }
        } catch (error) {
            this.showMessage(`Error renaming ${itemType}: ${error.message}`, 'fail');
        }
    }

    async handleDelete() {
        if (this.selectedFiles.length === 0) {
            this.showMessage('No files or folders selected for deletion', 'warning');
            return;
        }
        if (!confirm('Are you sure you want to delete the selected files/folders?')) {
            return; // User cancelled deletion
        }
        for (const file of this.selectedFiles) {
            let itemType = "zettel";
            let id = file.dataset.id;
            if (file.dataset.type === 'folder') {
                if (file.dataset.isRoot === "true") {
                    continue; // Skip deletion of root folder
                }
                itemType = "folder";
                id = file.dataset.folderId;
            }
            else if (file.dataset.type === 'file') {
                itemType = "file";
                id = file.dataset.id;
            }
            try {
                const response = await fetch(`/zettelkasten/zettel/${itemType}/${id}/delete/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': this.getCSRFToken()
                    }
                });

                const data = await response.json();

                if (data.success) {
                    this.showMessage(`Deleted Files`, 'success');

                    file.remove();
                } else {
                    this.showMessage(`Failed to delete ${path}: ${data.error}`, 'fail');
                }
            } catch (error) {
                this.showMessage(`Error deleting ${path}: ${error.message}`, 'fail');
            }
        }
    }

    /**
     * Add a new file element to the DOM without reloading
     */
    addNewFileToDOM(fileId, fileName) {
        //get direct children
        const folderFiles = this.parentFolder.querySelector(':scope > .folder-content');
        // Create the new file element with exact same structure as template
        const fileElement = document.createElement('div');
        fileElement.className = 'file';
        fileElement.setAttribute('data-type', 'zettel');
        fileElement.setAttribute('data-id', fileId);
        
        // Create file content with proper structure - newly created files are always private
        fileElement.innerHTML = `
            <div class="folder-name">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="folder-icon">
                    <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" />
                    <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                </svg>
                <p>${fileName}</p>
            </div>
        `;

        // Find all folders inside the folderFiles container
        const folders = folderFiles.querySelectorAll(':scope > .folder');
        if (folders.length > 0) {
            // Insert after the last folder
            const lastFolder = folders[folders.length - 1];
            lastFolder.after(fileElement);
        } else {
            // No folders, insert at the beginning
            folderFiles.prepend(fileElement);
        }

        // Reorder the parent folder to maintain proper ordering
        this.reorderFolderContents(this.parentFolder);
    }

    addNewFolderToDOM(folderId, folderName) {
        // Get or create the folder-children container
        let folderChildren = this.parentFolder.querySelector(':scope > .folder-content ');


        // Create the new folder element with exact same structure as template
        // NOTE: New folders are created EXPANDED (no 'retracted' class)
        const folderElement = document.createElement('div');
        folderElement.className = 'folder'; // No 'retracted' class = expanded
        folderElement.setAttribute('data-folder-id', folderId);
        folderElement.setAttribute('data-type', 'folder');
        
        // Create folder content with proper structure matching template
        folderElement.innerHTML = `
            <div class="folder-name">
                <div class="folder-toggle">
                    <span class="arrow">▼</span>
                    <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path class="folder-closed-path" d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
                        <path class="folder-open-path" d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 0 0-3-3h-3.879a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H6a3 3 0 0 0-3 3v3.162A3.756 3.756 0 0 1 4.094 9h15.812ZM4.094 10.5a2.25 2.25 0 0 0-2.227 2.568l.857 6A2.25 2.25 0 0 0 4.951 21H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-2.227-2.568H4.094Z" />
                    </svg>
                </div>
                <p>${folderName}</p>
            </div>
            <div class="folder-content">
            </div>
        `;

        // Add the new folder to the folder-children container
        folderChildren.prepend(folderElement);

        // Reorder the parent folder to maintain proper ordering
        this.reorderFolderContents(this.parentFolder);
    }

    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.container.dispatchEvent(event);
    }

    getCSRFToken() {
        // Use IDEController's method if available, otherwise fallback to local implementation
        if (this.ideController && this.ideController.getCSRFToken) {
            return this.ideController.getCSRFToken();
        }
        
        // Fallback implementation if no IDEController
        const domToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (domToken) {
            return domToken;
        }
        
        let cookieValue = null;
        const name = 'csrftoken';
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    showMessage(text, type = 'info', duration = 3000) {
        const eventData = { text, type, duration };
        this.emit('showMessage', eventData);
    }
}

// Export for use in other modules
window.FileManager = FileManager;