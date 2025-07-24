/**
 * IDEController.js
 * 
 * Main orchestrator class that coordinates FileManager, TabManager, and PanelResizer
 * to create a cohesive Obsidian-like IDE experience.
 */

class IDEController {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            maxRecentFiles: 10,
            enableHotkeys: true,
            ...options
        };

        // Component instances
        this.fileManager = null;
        this.tabManager = null;
        this.panelResizer = null;
        this.editorFactory = null;

        // State management
        this.recentFiles = [];
        this.openFiles = new Map(); // file id -> file data
        this.autoSaveTimer = null;

        // Event handlers
        this.onFileLoad = null;
        this.onFileSave = null;
        this.onError = null;

        this.init();
    }

    init() {
        this.initializeComponents();
        this.setupComponentIntegration();
        this.setupAutoSave();
        this.setupGlobalHotkeys();
        this.loadUserPreferences();
        
        console.log('IDE Controller initialized successfully');
    }

    initializeComponents() {
        // Initialize FileManager
        this.fileManager = new FileManager('.file-manager-container', {
            multiSelect: true,
            keyboardShortcuts: true,
            contextMenu: true
        });

        // Initialize TabManager
        this.tabManager = new TabManager('.editor-container', {
            maxTabs: 20,
            showCloseButton: true,
            enableReordering: true,
            persistTabs: true
        });

        // Initialize PanelResizer
        this.panelResizer = new PanelResizer('.zettelkasten-container', {
            minPanelSize: 200,
            persistSizes: true,
            smoothResize: true
        });

        // Initialize EditorFactory
        this.editorFactory = new EditorFactory({
            theme: 'mytheme',
            autoSave: this.options.autoSave,
            autoSaveDelay: 1000
        });
    }

    setupComponentIntegration() {
        // FileManager events
        this.fileManager.setOnFileSelect((selectedFiles, activeFileId) => {
            this.handleFileSelection(selectedFiles, activeFileId);
        });

        this.fileManager.setOnFileOpen((fileId, openMode) => {
            this.handleFileOpen(fileId, openMode);
        });

        this.fileManager.setOnFileCreate((fileName, parentFolder) => {
            this.handleFileCreate(fileName, parentFolder);
        });

        this.fileManager.setOnFileDelete((fileIds) => {
            this.handleFileDelete(fileIds);
        });

        this.fileManager.setOnFolderCreate((folderName, parentFolder) => {
            this.handleFolderCreate(folderName, parentFolder);
        });

        // TabManager events
        this.tabManager.setOnTabCreate((tab) => {
            this.handleTabCreate(tab);
        });

        this.tabManager.setOnTabClose((tab) => {
            this.handleTabClose(tab);
        });

        this.tabManager.setOnTabSwitch((newTab, oldTab) => {
            this.handleTabSwitch(newTab, oldTab);
        });

        // Editor integration (if CodeMirror is available)
        if (window.cmEditor) {
            this.integrateWithCodeMirror();
        }
    }

    // File operation handlers
    async handleFileSelection(selectedFiles, activeFileId) {
        console.log('Files selected:', selectedFiles);
        
        // Update file information panel if exists
        this.updateFileInfoPanel(activeFileId);
        
        // Enable/disable actions based on selection
        this.updateToolbarStates(selectedFiles);
    }

    async handleFileOpen(fileId, openMode) {
        try {
            // Check if file is already open in a tab
            const existingTab = this.findTabByFileId(fileId);
            
            if (existingTab) {
                if (openMode === 'new-tab') {
                    // Create a new tab for the same file
                    await this.openFileInNewTab(fileId);
                } else {
                    // Switch to existing tab
                    this.tabManager.switchToTab(existingTab.id);
                }
            } else {
                // Load file content and open in appropriate tab
                if (openMode === 'new-tab') {
                    await this.openFileInNewTab(fileId);
                } else {
                    await this.openFileInCurrentTab(fileId);
                }
            }

            // Add to recent files
            this.addToRecentFiles(fileId);

        } catch (error) {
            this.handleError('Failed to open file', error);
        }
    }

    async handleFileCreate(fileName, parentFolder) {
        try {
            // Call API to create file
            const response = await this.apiCall('POST', '/api/files/', {
                name: fileName,
                parent_folder: parentFolder?.id || null,
                content: ''
            });

            if (response.success) {
                // Refresh file manager
                this.fileManager.refreshFiles();
                
                // Open the new file
                await this.openFileInNewTab(response.data.id);
                
                this.showNotification(`File "${fileName}" created successfully`);
            }
        } catch (error) {
            this.handleError('Failed to create file', error);
        }
    }

    async handleFileDelete(fileIds) {
        try {
            // Close tabs for deleted files
            fileIds.forEach(fileId => {
                const tab = this.findTabByFileId(fileId);
                if (tab) {
                    this.tabManager.closeTab(tab.id);
                }
            });

            // Call API to delete files
            const response = await this.apiCall('DELETE', '/api/files/', {
                file_ids: fileIds
            });

            if (response.success) {
                // Refresh file manager
                this.fileManager.refreshFiles();
                
                this.showNotification(`${fileIds.length} file(s) deleted successfully`);
            }
        } catch (error) {
            this.handleError('Failed to delete files', error);
        }
    }

    async handleFolderCreate(folderName, parentFolder) {
        try {
            const response = await this.apiCall('POST', '/api/folders/', {
                name: folderName,
                parent_folder: parentFolder?.id || null
            });

            if (response.success) {
                this.fileManager.refreshFiles();
                this.showNotification(`Folder "${folderName}" created successfully`);
            }
        } catch (error) {
            this.handleError('Failed to create folder', error);
        }
    }

    // Tab operation handlers
    handleTabCreate(tab) {
        console.log('Tab created:', tab.fileName);
        
        // If this is a file tab, load the content
        if (tab.fileId) {
            this.loadFileContent(tab);
        }
    }

    handleTabClose(tab) {
        console.log('Tab closed:', tab.fileName);
        
        // Clean up editor instance
        if (tab.editorInstance) {
            this.editorFactory.removeEditor(tab.id);
            
            // Remove tab content from DOM
            const tabContent = this.container.querySelector(`[data-tab-id="${tab.id}"]`);
            if (tabContent) {
                tabContent.remove();
            }
        }
        
        // Clean up file data
        if (tab.fileId) {
            this.openFiles.delete(tab.fileId);
        }
    }

    handleTabSwitch(newTab, oldTab) {
        console.log('Tab switched:', oldTab?.fileName, '->', newTab.fileName);
        
        // Hide old tab content
        if (oldTab) {
            const oldContent = this.container.querySelector(`[data-tab-id="${oldTab.id}"]`);
            if (oldContent) {
                oldContent.style.display = 'none';
            }
        }
        
        // Show new tab content
        const newContent = this.container.querySelector(`[data-tab-id="${newTab.id}"]`);
        if (newContent) {
            newContent.style.display = 'block';
            
            // Focus the editor
            if (newTab.editorInstance) {
                setTimeout(() => {
                    newTab.editorInstance.focus();
                    newTab.editorInstance.refresh();
                }, 10);
            }
        }
        
        // Load new tab content if not already loaded
        if (newTab.fileId && !newTab.editorInstance) {
            this.loadFileContent(newTab);
        }
        
        // Update file manager selection
        if (newTab.fileId) {
            this.fileManager.selectFile(newTab.fileId);
        }
    }

    // File content management
    async loadFileContent(tab) {
        try {
            if (!tab.fileId) {
                // New file - create empty content
                this.createEditorForTab(tab, '');
                return;
            }

            // Load from cache or API
            let fileData = this.openFiles.get(tab.fileId);
            
            if (!fileData) {
                const response = await this.apiCall('GET', `/api/files/${tab.fileId}/`);
                if (response.success) {
                    fileData = response.data;
                    this.openFiles.set(tab.fileId, fileData);
                }
            }

            if (fileData) {
                this.createEditorForTab(tab, fileData.content);
                
                if (this.onFileLoad) {
                    this.onFileLoad(fileData);
                }
            }

        } catch (error) {
            this.handleError('Failed to load file content', error);
        }
    }

    createEditorForTab(tab, content) {
        // Create a full-featured editor using EditorFactory
        const editorInstance = this.editorFactory.createEditor(tab.id, content);
        
        // Set up event handlers
        editorInstance.onChange = (isModified) => {
            this.tabManager.markTabAsModified(tab.id, isModified);
        };
        
        editorInstance.onSave = (isAutoSave = false) => {
            this.saveTabContent(tab);
            if (tab.fileId) {
                this.saveFile(tab.fileId, tab.content).then(success => {
                    if (success) {
                        editorInstance.lastSavedContent = editorInstance.getValue();
                        editorInstance.markClean();
                        
                        const message = isAutoSave ? `Auto-saved: ${tab.fileName}` : `Saved: ${tab.fileName}`;
                        this.showNotification(message, 'success', isAutoSave ? 2000 : 3000);
                    }
                });
            }
        };
        
        editorInstance.onFocus = () => {
            // Update file manager selection when editor gets focus
            if (tab.fileId) {
                this.fileManager.selectFile(tab.fileId);
            }
        };
        
        // Store editor instance in tab
        tab.editorInstance = editorInstance;
        
        // Add editor to the editor area
        const editorArea = this.container.querySelector('.editor-area') || 
                          this.container.querySelector('.editor-container');
        
        if (editorArea) {
            // Create tab content container
            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content-area';
            tabContent.dataset.tabId = tab.id;
            
            // Add toolbar if needed
            const toolbar = this.editorFactory.createToolbar(editorInstance);
            tabContent.appendChild(toolbar);
            
            // Add editor
            tabContent.appendChild(editorInstance.element);
            
            // Add to editor area
            editorArea.appendChild(tabContent);
            
            // Initial focus
            setTimeout(() => {
                editorInstance.focus();
                editorInstance.refresh();
            }, 100);
        }
    }

    saveTabContent(tab) {
        if (tab.editorInstance && tab.editorInstance.isModified) {
            const content = tab.editorInstance.getValue();
            tab.content = content;
            
            // Update file data cache
            if (tab.fileId) {
                const fileData = this.openFiles.get(tab.fileId);
                if (fileData) {
                    fileData.content = content;
                }
            }
        }
    }

    // Auto-save functionality
    setupAutoSave() {
        if (!this.options.autoSave) return;

        this.autoSaveTimer = setInterval(() => {
            this.autoSaveOpenFiles();
        }, this.options.autoSaveInterval);
    }

    async autoSaveOpenFiles() {
        const activeTab = this.tabManager.getActiveTab();
        if (!activeTab || !activeTab.isModified || !activeTab.fileId) return;

        try {
            this.saveTabContent(activeTab);
            
            const fileData = this.openFiles.get(activeTab.fileId);
            if (fileData) {
                await this.saveFile(activeTab.fileId, fileData.content);
                this.tabManager.markTabAsModified(activeTab.id, false);
                
                this.showNotification(`Auto-saved: ${activeTab.fileName}`, 'success', 2000);
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    // File operations
    async openFileInNewTab(fileId) {
        const fileData = await this.getFileData(fileId);
        if (fileData) {
            return this.tabManager.createTab(fileId, fileData.name, fileData.content);
        }
    }

    async openFileInCurrentTab(fileId) {
        const activeTab = this.tabManager.getActiveTab();
        
        if (activeTab && !activeTab.fileId) {
            // Use current empty tab
            const fileData = await this.getFileData(fileId);
            if (fileData) {
                activeTab.fileId = fileId;
                activeTab.fileName = fileData.name;
                this.loadFileContent(activeTab);
            }
        } else {
            // Create new tab
            return this.openFileInNewTab(fileId);
        }
    }

    async getFileData(fileId) {
        try {
            let fileData = this.openFiles.get(fileId);
            
            if (!fileData) {
                const response = await this.apiCall('GET', `/api/files/${fileId}/`);
                if (response.success) {
                    fileData = response.data;
                    this.openFiles.set(fileId, fileData);
                }
            }
            
            return fileData;
        } catch (error) {
            this.handleError('Failed to get file data', error);
            return null;
        }
    }

    async saveFile(fileId, content) {
        try {
            const response = await this.apiCall('PUT', `/api/files/${fileId}/`, {
                content: content
            });

            if (response.success && this.onFileSave) {
                this.onFileSave(response.data);
            }

            return response.success;
        } catch (error) {
            this.handleError('Failed to save file', error);
            return false;
        }
    }

    // Global hotkeys
    setupGlobalHotkeys() {
        if (!this.options.enableHotkeys) return;

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveCurrentFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.showOpenFileDialog();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.fileManager.createNewFile();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.showGlobalSearch();
                        break;
                    case 'p':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showCommandPalette();
                        }
                        break;
                }
            }
        });
    }

    async saveCurrentFile() {
        const activeTab = this.tabManager.getActiveTab();
        if (!activeTab || !activeTab.fileId) return;

        this.saveTabContent(activeTab);
        const fileData = this.openFiles.get(activeTab.fileId);
        
        if (fileData) {
            const success = await this.saveFile(activeTab.fileId, fileData.content);
            if (success) {
                this.tabManager.markTabAsModified(activeTab.id, false);
                this.showNotification(`Saved: ${activeTab.fileName}`, 'success');
            }
        }
    }

    // Utility methods
    findTabByFileId(fileId) {
        return this.tabManager.getAllTabs().find(tab => tab.fileId === fileId);
    }

    addToRecentFiles(fileId) {
        // Remove if already exists
        this.recentFiles = this.recentFiles.filter(id => id !== fileId);
        
        // Add to beginning
        this.recentFiles.unshift(fileId);
        
        // Limit size
        if (this.recentFiles.length > this.options.maxRecentFiles) {
            this.recentFiles = this.recentFiles.slice(0, this.options.maxRecentFiles);
        }
        
        this.saveUserPreferences();
    }

    updateToolbarStates(selectedFiles) {
        // Enable/disable toolbar buttons based on selection
        const hasSelection = selectedFiles.length > 0;
        const hasSingleSelection = selectedFiles.length === 1;
        
        // Update button states (implementation depends on your toolbar structure)
        console.log('Updating toolbar states:', { hasSelection, hasSingleSelection });
    }

    updateFileInfoPanel(fileId) {
        // Update file information panel if it exists
        console.log('Updating file info panel for:', fileId);
    }

    // API communication
    async apiCall(method, url, data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            throw new Error(`API call failed: ${error.message}`);
        }
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    // User preferences
    saveUserPreferences() {
        const prefs = {
            recentFiles: this.recentFiles,
            // Add other preferences as needed
        };
        localStorage.setItem('ide.preferences', JSON.stringify(prefs));
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('ide.preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.recentFiles = prefs.recentFiles || [];
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    // UI feedback
    showNotification(message, type = 'info', duration = 5000) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-primary-500);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    handleError(message, error) {
        console.error(message, error);
        this.showNotification(`${message}: ${error.message}`, 'error');
        
        if (this.onError) {
            this.onError(message, error);
        }
    }

    // Placeholder methods for future features
    showOpenFileDialog() {
        console.log('Open file dialog - to be implemented');
    }

    showGlobalSearch() {
        console.log('Global search - to be implemented');
    }

    showCommandPalette() {
        console.log('Command palette - to be implemented');
    }

    integrateWithCodeMirror() {
        console.log('CodeMirror integration - customizing for IDE');
        // Add any CodeMirror-specific customizations here
    }

    // Public API
    openFile(fileId) {
        return this.handleFileOpen(fileId, 'current-tab');
    }

    createNewFile(fileName, content = '') {
        return this.tabManager.createTab(null, fileName, content);
    }

    getCurrentFile() {
        const activeTab = this.tabManager.getActiveTab();
        return activeTab ? this.openFiles.get(activeTab.fileId) : null;
    }

    // Cleanup
    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        // Save current state
        this.saveUserPreferences();
        
        console.log('IDE Controller destroyed');
    }

    // Event listener setters
    setOnFileLoad(callback) { this.onFileLoad = callback; }
    setOnFileSave(callback) { this.onFileSave = callback; }
    setOnError(callback) { this.onError = callback; }
}

// Export for use in other modules
window.IDEController = IDEController;
