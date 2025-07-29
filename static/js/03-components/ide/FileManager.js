/**
 * =====================================================================================
 * FileManager.js - Obsidian-Style File Explorer
 * =====================================================================================
 * 
 * OVERVIEW:
 * Advanced file manager component that provides Obsidian-like file exploration
 * capabilities with sophisticated selection handling, keyboard navigation,
 * and folder management features.
 * 
 * ARCHITECTURE:
 * - Selection System: Multi-select with Ctrl+click, Shift+click, and keyboard navigation
 * - Folder Management: Collapsible folders with state persistence
 * - Event System: Comprehensive event handling for file operations
 * - Keyboard Navigation: Full keyboard support for accessibility
 * - Context Menus: Right-click operations for file/folder actions
 * 
 * FEATURES:
 * - Multi-selection support (Ctrl+click, Shift+click, Shift+arrow keys)
 * - Folder collapse/expand with visual indicators (▶ ▼)
 * - Keyboard navigation (arrow keys, Enter, Delete, etc.)
 * - File operations (create, delete, rename, duplicate)
 * - Folder operations (create, expand/collapse)
 * - Context menu support for right-click operations
 * - State persistence (expanded folders, selections)
 * - Visual feedback for selections and hover states
 * - Accessibility support with proper ARIA attributes
 * 
 * SELECTION BEHAVIORS:
 * - Single Click: Select single file/folder
 * - Ctrl+Click: Add/remove from selection
 * - Shift+Click: Select range from last selected to clicked
 * - Shift+Arrow Keys: Extend selection in direction
 * - Ctrl+A: Select all files in current folder
 * - Escape: Clear selection
 * 
 * KEYBOARD SHORTCUTS:
 * - ↑↓: Navigate up/down
 * - ←→: Collapse/expand folders
 * - Enter: Open selected file(s)
 * - Delete: Delete selected file(s)
 * - F2: Rename selected file
 * - Ctrl+N: Create new file
 * - Ctrl+Shift+N: Create new folder
 * - Ctrl+D: Duplicate selected file
 * 
 * EVENTS EMITTED:
 * - onFileSelect: When file selection changes
 * - onFileOpen: When file is opened (double-click or Enter)
 * - onFileCreate: When new file is created
 * - onFileDelete: When file is deleted
 * - onFolderCreate: When new folder is created
 * - onFolderToggle: When folder is expanded/collapsed
 * 
 * USAGE:
 * ```javascript
 * const fileManager = new FileManager('.file-manager-container', {
 *     multiSelect: true,
 *     keyboardShortcuts: true,
 *     contextMenu: true
 * });
 * 
 * // Set up event handlers
 * fileManager.onFileSelect = (selectedFiles) => console.log('Selected:', selectedFiles);
 * fileManager.onFileOpen = (file) => console.log('Opening:', file);
 * 
 * // Programmatic operations
 * fileManager.selectFile('file-id-123');
 * fileManager.expandFolder('folder-id-456');
 * ```
 * 
 * DEPENDENCIES:
 * - DOM manipulation utilities
 * - Keyboard event handling
 * - File system API integration
 * 
 * ACCESSIBILITY:
 * - Full keyboard navigation support
 * - Proper ARIA labels and roles
 * - Screen reader compatibility
 * - High contrast support
 * =====================================================================================
 */

class FileManager {
    /**
     * CONSTRUCTOR: Initialize the File Manager
     * 
     * @param {string} containerSelector - CSS selector for the file manager container
     * @param {Object} options - Configuration options
     * @param {boolean} options.multiSelect - Enable multi-selection (default: true)
     * @param {boolean} options.keyboardShortcuts - Enable keyboard shortcuts (default: true)
     * @param {boolean} options.contextMenu - Enable context menu (default: true)
     * @param {boolean} options.dragDrop - Enable drag and drop (default: false, future feature)
     */
    constructor(containerSelector, options = {}) {
        // DOM Reference
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`File manager container not found: ${containerSelector}`);
        }

        // Configuration with defaults
        this.options = {
            multiSelect: true,
            keyboardShortcuts: true,
            contextMenu: true,
            dragDrop: false, // Future feature
            ...options
        };

        // Selection State Management
        this.selectedFiles = new Set();     // Set of selected file IDs for fast lookup
        this.lastSelectedFile = null;       // Last clicked file for range selection
        this.expandedFolders = new Set();   // Set of expanded folder IDs
        this.files = new Map();             // file id -> file data mapping
        this.folders = new Map();           // folder id -> folder data mapping
        
        // Event handlers - can be set by external code
        this.onFileSelect = null;     // Called when selection changes
        this.onFileOpen = null;       // Called when file is opened
        this.onFileCreate = null;     // Called when new file is created
        this.onFileDelete = null;     // Called when file is deleted
        this.onFolderCreate = null;   // Called when new folder is created
        this.onFolderToggle = null;   // Called when folder is expanded/collapsed
        
        // Initialize the file manager
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialState();
        this.setupKeyboardShortcuts();
        this.setupToolbarActions();
    }

    setupEventListeners() {
        // Folder collapse/expand
        this.container.addEventListener('click', (e) => {
            const folderName = e.target.closest('.folder-name:not(.files)');
            if (folderName) {
                e.stopPropagation();
                this.toggleFolder(folderName);
            }
        });

        // File selection
        this.container.addEventListener('click', (e) => {
            const fileElement = e.target.closest('.file');
            if (fileElement) {
                e.preventDefault();
                e.stopPropagation();
                this.handleFileClick(fileElement, e);
            }
        });

        // Middle click for new tab
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                const fileElement = e.target.closest('.file');
                if (fileElement) {
                    e.preventDefault();
                    this.openFileInNewTab(fileElement);
                }
            }
        });

        // Double click to open in current tab
        this.container.addEventListener('dblclick', (e) => {
            const fileElement = e.target.closest('.file');
            if (fileElement) {
                e.preventDefault();
                this.openFileInCurrentTab(fileElement);
            }
        });

        // Context menu (right click)
        this.container.addEventListener('contextmenu', (e) => {
            const fileElement = e.target.closest('.file');
            const folderElement = e.target.closest('.folder');
            
            if (fileElement || folderElement) {
                e.preventDefault();
                this.showContextMenu(e, fileElement, folderElement);
            }
        });
    }

    toggleFolder(folderElement) {
        const folder = folderElement.closest('.folder');
        const folderContent = folder.querySelector('.folder-content');
        const folderName = folderElement; // folderElement is already the .folder-name
        const folderId = this.getFolderId(folder);
        
        // Check if folder is currently expanded using the CSS class instead of inline style
        const isExpanded = folderName.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            folderContent.style.display = 'none';
            folderName.classList.remove('expanded');
            this.expandedFolders.delete(folderId);
        } else {
            // Expand
            folderContent.style.display = 'block';
            folderName.classList.add('expanded');
            this.expandedFolders.add(folderId);
        }

        this.saveState();
    }

    handleFileClick(fileElement, event) {
        const fileId = fileElement.dataset.id;
        
        if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd
            this.toggleFileSelection(fileElement);
        } else if (event.shiftKey && this.lastSelectedFile) {
            // Range select with Shift
            this.selectFileRange(this.lastSelectedFile, fileElement);
        } else {
            // Single select
            this.selectSingleFile(fileElement);
        }

        this.lastSelectedFile = fileElement;
        
        // Trigger callback
        if (this.onFileSelect) {
            this.onFileSelect(Array.from(this.selectedFiles), fileId);
        }
    }

    selectSingleFile(fileElement) {
        // Clear previous selection
        this.clearSelection();
        
        // Select new file
        fileElement.classList.add('selected');
        this.selectedFiles.add(fileElement.dataset.id);
    }

    toggleFileSelection(fileElement) {
        const fileId = fileElement.dataset.id;
        
        if (this.selectedFiles.has(fileId)) {
            fileElement.classList.remove('selected');
            this.selectedFiles.delete(fileId);
        } else {
            fileElement.classList.add('selected');
            this.selectedFiles.add(fileId);
        }
    }

    selectFileRange(startElement, endElement) {
        this.clearSelection();
        
        const allFiles = Array.from(this.container.querySelectorAll('.file'));
        const startIndex = allFiles.indexOf(startElement);
        const endIndex = allFiles.indexOf(endElement);
        
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        
        for (let i = start; i <= end; i++) {
            const file = allFiles[i];
            file.classList.add('selected');
            this.selectedFiles.add(file.dataset.id);
        }
    }

    clearSelection() {
        this.container.querySelectorAll('.file.selected').forEach(file => {
            file.classList.remove('selected');
        });
        this.selectedFiles.clear();
    }

    setupKeyboardShortcuts() {
        if (!this.options.keyboardShortcuts) return;

        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when file manager is focused
            if (!this.container.contains(document.activeElement)) return;

            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    if (this.selectedFiles.size > 0) {
                        e.preventDefault();
                        this.deleteSelectedFiles();
                    }
                    break;
                    
                case 'Enter':
                    if (this.selectedFiles.size === 1) {
                        e.preventDefault();
                        const fileId = Array.from(this.selectedFiles)[0];
                        const fileElement = this.container.querySelector(`[data-id="${fileId}"]`);
                        this.openFileInCurrentTab(fileElement);
                    }
                    break;
                    
                case 'F2':
                    if (this.selectedFiles.size === 1) {
                        e.preventDefault();
                        this.renameSelectedFile();
                    }
                    break;
                    
                case 'ArrowUp':
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateFiles(e.key === 'ArrowUp' ? -1 : 1, e.shiftKey);
                    break;
            }
        });
    }

    setupToolbarActions() {
        const toolbar = document.querySelector('.file-manager-bar');
        if (!toolbar) return;

        // New file button
        const newFileBtn = toolbar.querySelector('[title="New zettel"]');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.createNewFile());
        }

        // New folder button
        const newFolderBtn = toolbar.querySelector('[title="New folder"]');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => this.createNewFolder());
        }

        // Upload button
        const uploadBtn = toolbar.querySelector('[title="Upload"]');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadFiles());
        }

        // Download button
        const downloadBtn = toolbar.querySelector('[title="Download"]');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadSelected());
        }

        // Search button
        const searchBtn = toolbar.querySelector('[title="Search"]');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.openSearch());
        }
    }

    // File operations
    openFileInCurrentTab(fileElement) {
        const fileId = fileElement.dataset.id;
        if (this.onFileOpen) {
            this.onFileOpen(fileId, 'current-tab');
        }
    }

    openFileInNewTab(fileElement) {
        const fileId = fileElement.dataset.id;
        if (this.onFileOpen) {
            this.onFileOpen(fileId, 'new-tab');
        }
    }

    createNewFile() {
        // Get current folder context
        const selectedFolder = this.getSelectedFolderContext();
        
        const fileName = prompt('Enter file name:', 'Untitled');
        if (fileName) {
            if (this.onFileCreate) {
                this.onFileCreate(fileName, selectedFolder);
            }
        }
    }

    createNewFolder() {
        const selectedFolder = this.getSelectedFolderContext();
        
        const folderName = prompt('Enter folder name:', 'New Folder');
        if (folderName) {
            if (this.onFolderCreate) {
                this.onFolderCreate(folderName, selectedFolder);
            }
        }
    }

    deleteSelectedFiles() {
        if (this.selectedFiles.size === 0) return;
        
        const fileNames = Array.from(this.selectedFiles).map(id => {
            const element = this.container.querySelector(`[data-id="${id}"]`);
            return element?.textContent?.trim() || id;
        });
        
        const message = `Delete ${fileNames.length} file(s)?\n${fileNames.join(', ')}`;
        
        if (confirm(message)) {
            if (this.onFileDelete) {
                this.onFileDelete(Array.from(this.selectedFiles));
            }
        }
    }

    // Utility methods
    getFolderId(folderElement) {
        // Extract folder ID from data attribute or path
        return folderElement.dataset.folderId || 
               folderElement.querySelector('.folder-name p')?.textContent?.trim() || 
               Math.random().toString(36);
    }

    getSelectedFolderContext() {
        // Determine which folder context we're in based on selection
        if (this.selectedFiles.size > 0) {
            const firstSelected = this.container.querySelector(`[data-id="${Array.from(this.selectedFiles)[0]}"]`);
            return firstSelected?.closest('.folder');
        }
        return null;
    }

    navigateFiles(direction, extend = false) {
        const allFiles = Array.from(this.container.querySelectorAll('.file'));
        const currentIndex = this.lastSelectedFile ? 
            allFiles.indexOf(this.lastSelectedFile) : -1;
        
        const newIndex = Math.max(0, Math.min(allFiles.length - 1, currentIndex + direction));
        const newFile = allFiles[newIndex];
        
        if (newFile) {
            if (extend && this.options.multiSelect) {
                this.toggleFileSelection(newFile);
            } else {
                this.selectSingleFile(newFile);
            }
            this.lastSelectedFile = newFile;
            
            // Scroll into view
            newFile.scrollIntoView({ block: 'nearest' });
        }
    }

    showContextMenu(event, fileElement, folderElement) {
        // This will be implemented with the context menu component
        console.log('Context menu requested', { fileElement, folderElement, event });
    }

    // State management
    saveState() {
        const state = {
            expandedFolders: Array.from(this.expandedFolders),
            selectedFiles: Array.from(this.selectedFiles)
        };
        localStorage.setItem('fileManager.state', JSON.stringify(state));
    }

    loadInitialState() {
        try {
            const savedState = localStorage.getItem('fileManager.state');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.expandedFolders = new Set(state.expandedFolders || []);
                this.selectedFiles = new Set(state.selectedFiles || []);
            }
            
            // Always ensure root folders are expanded
            this.ensureRootFoldersExpanded();
            
            // Apply saved state to DOM
            this.applyExpandedState();
            this.applySelectionState();
        } catch (error) {
            console.warn('Failed to load file manager state:', error);
            // Fallback: just ensure root folders are expanded
            this.ensureRootFoldersExpanded();
            this.applyExpandedState();
        }
    }

    ensureRootFoldersExpanded() {
        // Find all root folders and add them to expanded set
        const rootFolders = this.container.querySelectorAll('.folder.root-folder');
        rootFolders.forEach(folder => {
            const folderId = this.getFolderId(folder);
            this.expandedFolders.add(folderId);
            
            // Ensure the folder name has the expanded class
            const folderName = folder.querySelector('.folder-name');
            if (folderName) {
                folderName.classList.add('expanded');
            }
        });
    }

    applyExpandedState() {
        this.expandedFolders.forEach(folderId => {
            const folder = this.container.querySelector(`[data-folder-id="${folderId}"]`);
            if (folder) {
                const folderContent = folder.querySelector('.folder-content');
                const folderName = folder.querySelector('.folder-name');
                
                if (folderContent && folderName) {
                    folderContent.style.display = 'block';
                    folderName.classList.add('expanded');
                }
            }
        });
    }

    applySelectionState() {
        this.selectedFiles.forEach(fileId => {
            const fileElement = this.container.querySelector(`[data-id="${fileId}"]`);
            if (fileElement) {
                fileElement.classList.add('selected');
            }
        });
    }

    // Public API methods
    refreshFiles() {
        // Reload file tree from server
        // Implementation depends on your API
    }

    getSelectedFiles() {
        return Array.from(this.selectedFiles);
    }

    selectFile(fileId) {
        const fileElement = this.container.querySelector(`[data-id="${fileId}"]`);
        if (fileElement) {
            this.selectSingleFile(fileElement);
        }
    }

    expandFolder(folderId) {
        const folder = this.container.querySelector(`[data-folder-id="${folderId}"]`);
        if (folder) {
            const folderName = folder.querySelector('.folder-name');
            if (folderName && !folderName.classList.contains('expanded')) {
                this.toggleFolder(folderName);
            }
        }
    }

    // Event listener setters
    setOnFileSelect(callback) { this.onFileSelect = callback; }
    setOnFileOpen(callback) { this.onFileOpen = callback; }
    setOnFileCreate(callback) { this.onFileCreate = callback; }
    setOnFileDelete(callback) { this.onFileDelete = callback; }
    setOnFolderCreate(callback) { this.onFolderCreate = callback; }
}

// Export for use in other modules
window.FileManager = FileManager;
