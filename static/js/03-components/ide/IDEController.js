/**
 * IDEController - Main IDE o    initializeComponents() {
        // Initialize file manager
        this.fileManager = new FileManager('.file-manager-content', {
            ideController: this  // Pass reference to IDEController
        });
        
        // Initialize resizer
        this.resizer = new Resizer('.ide-container');
    }ator
 * Manages FileManager, Resizer and coordinates IDE functionality
 */
class IDEController {
    constructor() {
        this.fileManager = null;
        this.resizer = null;
        this.currentFile = null;
        this.isInitialized = false;
        this.messageTimeout = null;
        
        this.init();
    }

    init() {
        try {
            // Verify CodeMirror is available
            if (!window.cmEditor) {
                throw new Error('CodeMirror editor not found. Make sure editor.html is loaded first.');
            }
            
            // Initialize components
            this.initializeComponents();
            
            // Setup integrations
            this.setupEventHandlers();
            
            this.isInitialized = true;
        } catch (error) {
        }
    }

    initializeComponents() {
        // Initialize file manager
        this.fileManager = new FileManager('.file-manager-container');
        
        // Initialize resizer
        this.resizer = new Resizer('.ide-container');
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
            this.updateEditor(data.content, data.title);
            
            // Store current file info
            this.currentFile = {
                ...this.currentFile,
                id: fileId,
                title: data.title,
                content: data.contentRaw
            };
            
            this.showMessage(`Loaded: ${data.title}`, 'success', 2000);
            
        } catch (error) {
            this.showMessage(`Failed to load file: ${error.message}`, 'fail', 5000);
        } 
    }

    updateEditor(content, filename) {
        // Check if CodeMirror editor is available
        if (window.cmEditor) {
            // Set the content in CodeMirror
            window.cmEditor.setValue(content || '');
            
            // Move cursor to start
            window.cmEditor.setCursor(0, 0);
            
            // Clear history to prevent undo to previous file
            window.cmEditor.clearHistory();
            
            // Update live preview if available
            if (window.livePreview) {
                window.livePreview.updatePreview();
            }
            
            // Focus the editor
            window.cmEditor.focus();
            
        } else {
        }
    }






    saveFile(fileId, content) {
        // Use current file ID if not provided
        const targetFileId = fileId || this.currentFile?.id;
        const targetContent = content || (window.cmEditor ? window.cmEditor.getValue() : '');
        
        if (!targetFileId) {
            return;
        }
        
        this.saveFileContent(targetFileId, targetContent);
    }

    async saveFileContent(fileId, content) {
        try {
            
            // Save content to server using the existing API
            const response = await fetch(`/zettelkasten/zettel/${fileId}/update/`, {
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

// Note: IDEController is initialized in ide.html template
// Removed auto-initialization to prevent duplicate instances
