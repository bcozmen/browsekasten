/**
 * =====================================================================================
 * FileManager.js - Event-Driven File Manager
 * =====================================================================================
 * 
 * OVERVIEW:
 * Event-driven file manager that handles folder expand/collapse functionality
 * and file selection. Uses CustomEvent system for clean integration with other components.
 * 
 * FEATURES:
 * - Folder expand/collapse with "retracted" class toggle
 * - File selection handling with multi-select support
 * - Event-driven architecture with rich event data
 * - Keyboard navigation and shortcuts
 * - Toolbar actions (create, upload, download, rename, delete)
 * 
 * EVENTS EMITTED:
 * - 'fileSelected': When a file is opened for viewing/editing
 * - 'fileCreate': When new file creation is requested
 * - 'folderCreate': When new folder creation is requested  
 * - 'fileUpload': When files are selected for upload
 * - 'fileDownload': When selected files should be downloaded
 * - 'itemRename': When an item should be renamed
 * - 'itemDelete': When selected items should be deleted
 * 
 * USAGE:
 * ```javascript
 * const fileManager = new FileManager('.file-manager-container');
 * 
 * // Listen for events
 * fileManager.container.addEventListener('fileSelected', (e) => {
 *     // Handle file selection
 * });
 * ```
 * =====================================================================================
 */

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
        this.focusedFolder = null;    // Folder where new files will be created

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
            this.setupFocusedFolder();
        } catch (error) {
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

            if (fileElement) {
                this.handleFileClick(e, fileElement);
            }
            else if (arrowElement && folderElement) {
                this.toggleFolder(folderElement);
            }
            else if (folderElement) {
                this.handleFolderClick(e, folderElement);
            } else {
                console.log('Clicked on unhandled element:', e.target);
            }
        });
    }

    setupFocusedFolder() {
        // Focus on root folder at initialization
        const rootFolder = this.container.querySelector('.folder[data-is-root="true"]') || 
                          this.container.querySelector('.folder[data-name="root"]') ||
                          this.container.querySelector('.folder');
        
        if (rootFolder) {
            this.setFocusedFolder(rootFolder);
        }
    }

    /**
     * Handle file click with selection logic
     */
    handleFileClick(e, fileElement) {
        e.stopPropagation();

        if (e.ctrlKey) {
            this.selectFile(fileElement);
        } else if (e.shiftKey && this.activeFile) {
        } else {
            // Normal click: Single selection
            this.clearFileSelection();
            this.selectFile(fileElement);
            this.activeFile = fileElement;
            this.emit('file-manager:fileSelected', fileElement);
        }

        // Set focused folder to the parent folder of selected file
        const parentFolder = this.getParentFolder(fileElement);
        if (parentFolder) {
            this.setFocusedFolder(parentFolder);
        }
    }

    handleFolderClick(e, folderElement) {
        if (e.ctrlKey){
            this.selectFile(folderElement);
        }
    }
    getParentFolder(fileElement) {
        return fileElement.closest('.folder');
    }

    /**
     * Toggle folder expand/collapse
     */
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

    selectFile(fileElement) {
        if(fileElement.dataset.type !== 'folder') {

        }

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
            if (f.dataset.id) {
                return `file + ${f.dataset.id}`;
            } else if (f.dataset.folderId) {
                return `folder + ${f.dataset.folderId}`;
            } else {
                return 'unknown';
            }
        }));
    }

    clearFileSelection() {
        this.selectedFiles.forEach(file => file.classList.remove('file-selected'));
        this.selectedFiles = [];
        this.activeFile = null;
    }




    /**
     * Set focused folder (where new files will be created)
     */
    setFocusedFolder(folderElement) {
        // Remove previous focused folder styling
        if (this.focusedFolder) {
            const prevFolderName = this.focusedFolder.querySelector('.folder-name');
            if (prevFolderName) {
                prevFolderName.classList.remove('folder-focused');
            }
        }
        
        this.focusedFolder = folderElement;
        
        // Add focused folder styling
        if (folderElement) {
            const folderName = folderElement.querySelector('.folder-name');
            if (folderName) {
                folderName.classList.add('folder-focused');
            }
        }
    }

    setupToolbarHandlers() {
        const toolbar = this.container.querySelector('.tool-bar-container');
        if (!toolbar) return;
        
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
                        this.handleUpload();
                        break;
                    case 'download':
                        this.handleDownload();
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
        const folderId = this.focusedFolder.dataset.folderId;

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
                this.showMessage(`Created file: ${data.title}`, 'success');

                // Create and add the new file element to the DOM
                

                this.addNewFileToDOM(data.id, data.title);

            } else {
                this.showMessage(`Failed to create file: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Error creating file: ${error.message}`, 'error');
        }
    }

    async handleNewFolder() {
        const folderId = this.focusedFolder.dataset.folderId;

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
                this.showMessage(`Failed to create folder: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Error creating folder: ${error.message}`, 'error');   
        }


       
    }

    handleUpload() {
      
    }

    handleDownload() {
       
    }

    handleSearch() {
        
    }

    handleRename() {

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
            let path = "zettel";
            let id = file.dataset.id;
            if (file.classList.contains('folder')) {
                if (file.dataset.isRoot === "true") {
                    continue; // Skip deletion of root folder
                }
                path = "folder";
                id = file.dataset.folderId;
            }
            try {
                const response = await fetch(`/zettelkasten/zettel/${id}/delete_${path}/`, {
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
        const folderFiles = this.focusedFolder.querySelector(':scope > .folder-content');
        // Create the new file element with exact same structure as template
        const fileElement = document.createElement('div');
        fileElement.className = 'file';
        fileElement.setAttribute('data-type', 'file');
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
    }

    addNewFolderToDOM(folderId, folderName) {
        // Get or create the folder-children container
        let folderChildren = this.focusedFolder.querySelector(':scope > .folder-content ');
        

        // Create the new folder element with exact same structure as template
        // NOTE: New folders are created EXPANDED (no 'retracted' class)
        const folderElement = document.createElement('div');
        folderElement.className = 'folder'; // No 'retracted' class = expanded
        folderElement.setAttribute('data-folder-id', folderId);
        
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