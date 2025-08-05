/**
 * IDEController - Main IDE Controller
 * Manages FileManager, Resizer, Editor and coordinates IDE functionality
 */
class IDEController {
    constructor() {
        this.fileManager = null;
        this.resizer = null;
        this.editor = null;
        this.currentFile = null;
        this.isInitialized = false;
        this.messageTimeout = null;
        
        this.init();
    }

    init() {
        try {
            // Initialize components in proper order
            this.initializeComponents();
            
            // Setup integrations
            this.setupEventHandlers();
            
            this.isInitialized = true;
            console.log('IDEController initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IDEController:', error);
        }
    }

    initializeComponents() {
        // Initialize file manager
        this.fileManager = new FileManager('.file-manager-container', {
            ideController: this  // Pass reference to IDEController
        });
        
        // Initialize resizer
        this.resizer = new Resizer('.ide-container');
        
        // Initialize editor
        this.initializeEditor();
    }

    initializeEditor() {
        // Verify Editor class is available
        if (typeof Editor === 'undefined') {
            console.error('Editor class not found. Make sure Editor.js is loaded.');
            return;
        }
        
        try {
            this.editor = new Editor('code-editor', {
                onSave: (content) => {
                    this.handleEditorSave(content);
                },
                onContentChange: (content, change) => {
                    this.handleContentChange(content, change);
                },
                onReady: (editor) => {
                    console.log('Editor ready and initialized');
                }
            });
        } catch (error) {
            console.error('Failed to initialize editor:', error);
        }
    }

    handleEditorSave(content) {
        // Handle save request from editor
        if (this.currentFile && this.currentFile.id) {
            this.saveFileContent(this.currentFile.id, content);
        } else {
            this.showMessage('No file selected to save', 'warning', 3000);
        }
    }

    handleContentChange(content, change) {
        // Handle content changes (could be used for auto-save, etc.)
        // For now, just track that content has changed
    }

    setupEventHandlers() {
        // File manager integration
        if (this.fileManager) {
            // Listen for file selection events
            this.fileManager.container.addEventListener('file-manager:fileSelected', (e) => {
                console.log('File selected:', e.detail.dataset.id);
                this.currentFile = e.detail;
                this.loadFileContent(e.detail.dataset.id);
            });

            this.fileManager.container.addEventListener('showMessage', (e) => {
                this.showMessage(e.detail.text, e.detail.type, e.detail.duration);
            });
        }
    }



    async loadFileContent(fileId) {
        try {

            
            // Fetch file content from server using the existing API
            const response = await fetch(`/zettelkasten/zettel/${fileId}/get_zettel/`);
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load file');
            }
            
            // Update editor with file content
            this.updateEditor(data.content, data.name);

            // Store current file state
            this.currentFile = {
                id: fileId,
                type: 'zettel',
                name: data.name,
                folderId: data.folder_id,
                isPublic: data.is_public
            }

            this.showMessage(`Loaded: ${data.name}`, 'success', 2000);        
        } catch (error) {
            this.showMessage(`Failed to load file: ${error.message}`, 'fail', 5000);
        } 
    }

    updateEditor(content, filename) {
        // Check if editor is available
        if (this.editor && this.editor.cmEditor) {
            // Set the content in the editor
            this.editor.setValue(content || '');
            
            // Focus the editor
            this.editor.focus();
            
        } else if (window.cmEditor) {
            // Fallback to global CodeMirror editor if available
            window.cmEditor.setValue(content || '');
            window.cmEditor.setCursor(0, 0);
            window.cmEditor.clearHistory();
            
            if (window.livePreview) {
                window.livePreview.updatePreview();
            }
            
            window.cmEditor.focus();
        } else {
            console.warn('No editor available to update content');
        }
    }






    saveFile(fileId, content) {
        // Use current file ID if not provided
        const targetFileId = fileId || this.currentFile?.id;
        
        // Get content from editor if not provided
        let targetContent = content;
        if (!targetContent) {
            if (this.editor && this.editor.getValue) {
                targetContent = this.editor.getValue();
            } else if (window.cmEditor) {
                targetContent = window.cmEditor.getValue();
            } else {
                targetContent = '';
            }
        }
        
        if (!targetFileId) {
            this.showMessage('No file selected to save', 'warning', 3000);
            return;
        }
        
        this.saveFileContent(targetFileId, targetContent);
    }

    async saveFileContent(fileId, content) {
        try {
            
            // Save content to server using the existing API
            const response = await fetch(`/zettelkasten/zettel/${fileId}/update_zettel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    content: content
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to save file');
            }
            
            // Update current file content
            if (this.currentFile) {
                this.currentFile.content = content;
            }
            
            this.showMessage('File saved successfully!', 'success', 2000);
            
        } catch (error) {
            // Show error message to user
            const errorMessage = `Failed to save file: ${error.message}`;
            
            // Show error message in toolbar
            this.showMessage(errorMessage, 'fail', 5000);
        } 
    }

    getCSRFToken() {
        // First try to get from DOM element (form token)
        const domToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (domToken) {
            return domToken;
        }
        
        // Fallback to cookie with robust parsing
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

    showMessage(textContent, type = 'info', duration = 2000) {
        const messageElement = document.querySelector('.tool-bar-message-text');
        
        if (!messageElement) {
            return;
        }
        
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Remove all existing message type classes
        messageElement.classList.remove('success', 'fail', 'info', 'warning');
        
        // Set message content
        messageElement.textContent = textContent;
        
        // Add the appropriate CSS class for the message type
        messageElement.classList.add(type);
        
        // Hide message after duration
        this.messageTimeout = setTimeout(() => {
            messageElement.classList.remove('success', 'fail', 'info', 'warning');
            messageElement.textContent = '';
        }, duration);
    }

    // Event emitters for other components
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IDEController;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.IDEController = IDEController;
}
