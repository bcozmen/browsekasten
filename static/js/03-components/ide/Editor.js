/**
 * =====================================================================================
 * Editor.js - Main CodeMirror Editor Controller
 * =====================================================================================
 * 
 * OVERVIEW:
 * Manages the complete CodeMirror editor system including initialization,
 * component integration, and event handling. This class encapsulates all
 * editor functionality that was previously in editor.html.
 * 
 * FEATURES:
 * - CodeMirror editor initialization with optimal markdown configuration
 * - Integration with MarkdownLivePreview for Obsidian-style editing
 * - MarkdownFormatter for text formatting (bold, italic, etc.)
 * - EditorSearcher for find/replace functionality
 * - Toolbar event handling for formatting buttons
 * - Search toolbar event handling
 * - Keyboard shortcuts integration
 * - Auto-save and content management
 * 
 * ARCHITECTURE:
 * - Modular component integration
 * - Event-driven architecture
 * - Clean separation of concerns
 * - Extensible configuration system
 * 
 * USAGE:
 * ```javascript
 * const editor = new Editor('code-editor', {
 *     content: 'Initial content',
 *     theme: 'mytheme',
 *     autosave: true
 * });
 * ```
 */

class Editor {
    /**
     * CONSTRUCTOR: Initialize the editor system
     * 
     * @param {string} textareaId - ID of the textarea element to replace
     * @param {Object} options - Configuration options
     */
    constructor(textareaId, options = {}) {
        this.textareaId = textareaId;
        this.options = {
            // CodeMirror configuration
            mode: 'markdown',
            theme: 'mytheme',
            lineNumbers: true,
            lineWrapping: true,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            foldGutter: true,
            inputStyle: 'contenteditable',
            spellcheck: true,
            keyMap: 'sublime',
            
            // Component configuration
            livePreview: {
                enabled: true,
                widgetClass: 'markdown-line-widget markdown'
            },
            
            search: {
                caseSensitive: false,
                highlightClass: 'searching'
            },
            
            // Event handlers
            onReady: null,
            onContentChange: null,
            onSave: null,
            
            ...options
        };
        
        // Component instances
        this.cmEditor = null;
        this.livePreview = null;
        this.formatter = null;
        this.searcher = null;
        
        // State management
        this.isInitialized = false;
        this.lastSavedContent = '';
        this.init();
    }

    /**
     * INITIALIZATION: Set up the complete editor system
     */
    async init() {
        try {
            // Verify textarea exists
            const textarea = document.getElementById(this.textareaId);
            if (!textarea) {
                throw new Error(`Textarea with ID "${this.textareaId}" not found`);
            }

            // Initialize CodeMirror editor
            await this.initializeCodeMirror();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Make globally accessible
            window.cmEditor = this.cmEditor;
            window.livePreview = this.livePreview;
            window.formatter = this.formatter;
            window.searcher = this.searcher;
            
            // Call ready callback
            if (this.options.onReady) {
                this.options.onReady(this);
            }
            
            console.log('Editor initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize editor:', error);
            throw error;
        }
    }

    /**
     * CODEMIRROR INITIALIZATION: Create and configure CodeMirror instance
     */
    async initializeCodeMirror() {
        const textarea = document.getElementById(this.textareaId);
        
        // Ensure CodeMirror is loaded
        if (typeof CodeMirror === 'undefined') {
            throw new Error('CodeMirror library not loaded');
        }
        
        // Create CodeMirror instance
        this.cmEditor = CodeMirror.fromTextArea(textarea, {
            // Basic configuration
            mode: this.options.mode,
            theme: this.options.theme,
            lineNumbers: this.options.lineNumbers,
            lineWrapping: this.options.lineWrapping,
            styleActiveLine: this.options.styleActiveLine,
            
            // Bracket matching and auto-completion
            matchBrackets: this.options.matchBrackets,
            autoCloseBrackets: this.options.autoCloseBrackets,
            
            // Code folding support
            foldGutter: this.options.foldGutter,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            
            // Input and accessibility
            inputStyle: this.options.inputStyle,
            spellcheck: this.options.spellcheck,
            
            // Keyboard shortcuts
            keyMap: this.options.keyMap,
            
            // Autocomplete configuration
            hintOptions: {
                hint: CodeMirror.hint.anyword
            },
            
            // Basic extra keys (will be extended later)
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-Q": function(cm) { cm.foldCode(cm.getCursor()); }
            }
        });
    }

    /**
     * COMPONENT INITIALIZATION: Set up all editor components
     */
    async initializeComponents() {
        // Initialize live preview system
        if (window.MarkdownLivePreview) {
            try {
                this.livePreview = new MarkdownLivePreview(this.cmEditor, this.options.livePreview);
            } catch (error) {
                this.showMessage('Failed to initialize MarkdownLivePreview', 'warning');
            }
        } else {
            this.showMessage('MarkdownLivePreview not available', 'warning');
        }

        // Initialize formatting system
        if (window.MarkdownFormatter) {
            try {
                this.formatter = new MarkdownFormatter(this.cmEditor);
            } catch (error) {
                this.showMessage('Failed to initialize MarkdownFormatter', 'warning');
            }
        } else {
            this.showMessage('MarkdownFormatter not available', 'warning');
        }

        // Initialize search system
        if (window.EditorSearcher) {
            try {
                this.searcher = new EditorSearcher(this.cmEditor, this.options.search);
            } catch (error) {
                this.showMessage('Failed to initialize EditorSearcher', 'warning');
            }
        } else {
            this.showMessage('EditorSearcher not available', 'warning');
        }
    }

    /**
     * EVENT HANDLERS: Set up editor and UI event handling
     */
    setupEventHandlers() {
        // Content change handling
        this.cmEditor.on('change', (cm, change) => {
            if (this.options.onContentChange) {
                this.options.onContentChange(cm.getValue(), change);
            }
        });

        // Cursor activity for live preview
        this.cmEditor.on('cursorActivity', (cm) => {
            if (this.livePreview && this.livePreview.enabled) {
                this.livePreview.updatePreview();
            }
        });

        // Setup toolbar event handling
        this.setupToolbarEvents();
        
        // Setup search toolbar event handling
        this.setupSearchEvents();
    }

    /**
     * TOOLBAR EVENT HANDLING: Set up formatting toolbar
     */
    setupToolbarEvents() {
        // Target specifically the editor's toolbar, not the file manager's toolbar
        const toolbarContainer = document.querySelector('.editor-container .tool-bar-container');
        if (!toolbarContainer) {
            this.showMessage('Editor toolbar container not found', 'warning');
            return;
        }
        
        if (!this.formatter) {
            this.showMessage('Formatter not available for toolbar events', 'warning');
            return;
        }


        toolbarContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tool-bar-item[data-cmd]');
            if (!button) return;

            const cmd = button.dataset.cmd;
            console.log('Toolbar command clicked:', cmd);
            
            // Map HTML data-cmd values to formatter methods
            const cmdMap = {
                'bold': 'bold',
                'italic': 'italic',
                'strikethrough': 'strikethrough',
                'inline-code': 'code',
                'code-block': 'codeblock',
                'h1': 'header1',
                'h2': 'header2',
                'h3': 'header3',
                'bullet-list': 'list',
                'numbered-list': 'orderedlist',
                'link': 'link',
                'image': 'image',
                'blockquote': 'quote'
            };
            
            const formatterCmd = cmdMap[cmd];
            if (formatterCmd) {
                console.log('Executing formatter command:', formatterCmd);
                this.formatter.format(formatterCmd);
                e.preventDefault();
            } else {
                console.warn('Unknown toolbar command:', cmd);
            }
        });
    }

    /**
     * SEARCH EVENT HANDLING: Set up search and replace functionality
     */
    setupSearchEvents() {
        if (!this.searcher) {
            this.showMessage('EditorSearcher not available for search events', 'warning');
            return;
        }


        // Find input - real-time search
        const findInput = document.getElementById('editor-find-input');
        if (findInput) {
            console.log('Setting up find input events');
            findInput.addEventListener('input', (e) => {
                const query = e.target.value;
                if (query) {
                    this.searcher.search(query);
                } else {
                    this.searcher.clearHighlighting();
                }
            });

            findInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value;
                    if (query) {
                        this.searcher.search(query);
                        this.searcher.findNext();
                    }
                }
            });
        } else {
            this.showMessage('Editor find input not found', 'warning');
        }

        // Replace input
        const replaceInput = document.getElementById('editor-replace-input');
        if (replaceInput) {
            console.log('Setting up replace input events');
            replaceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = findInput?.value;
                    const replacement = e.target.value;
                    if (query) {
                        this.searcher.search(query);
                        this.searcher.replaceNext(replacement);
                    }
                }
            });
        } else {
            console.warn('Replace input not found');
        }

        // Search navigation buttons
        const findNext = document.getElementById('find-next');
        if (findNext) {
            console.log('Setting up find next button');
            findNext.addEventListener('click', () => {
                const query = findInput?.value;
                if (query) {
                    this.searcher.search(query);
                    this.searcher.findNext();
                }
            });
        } else {
            console.warn('Find next button not found');
        }

        const findPrev = document.getElementById('find-prev');
        if (findPrev) {
            console.log('Setting up find previous button');
            findPrev.addEventListener('click', () => {
                const query = findInput?.value;
                if (query) {
                    this.searcher.search(query);
                    this.searcher.findPrevious();
                }
            });
        } else {
            console.warn('Find previous button not found');
        }

        // Replace buttons
        const replaceBtn = document.getElementById('replace-btn');
        if (replaceBtn) {
            console.log('Setting up replace button');
            replaceBtn.addEventListener('click', () => {
                const query = findInput?.value;
                const replacement = replaceInput?.value || '';
                if (query) {
                    this.searcher.search(query);
                    this.searcher.replaceNext(replacement);
                }
            });
        } else {
            console.warn('Replace button not found');
        }

        const replaceAllBtn = document.getElementById('replace-all-btn');
        if (replaceAllBtn) {
            console.log('Setting up replace all button');
            replaceAllBtn.addEventListener('click', () => {
                const query = findInput?.value;
                const replacement = replaceInput?.value || '';
                if (query) {
                    this.searcher.search(query);
                    const count = this.searcher.replaceAll(replacement);
                    this.showMessage(`Replaced ${count} occurrences`, 'success', 2000);
                }
            });
        } else {
            console.warn('Replace all button not found');
        }

        // Close search
        const closeSearch = document.getElementById('close-search');
        if (closeSearch) {
            console.log('Setting up close search button');
            closeSearch.addEventListener('click', () => {
                if (findInput) findInput.value = '';
                if (replaceInput) replaceInput.value = '';
                this.searcher.clearSearch();
            });
        } else {
            console.warn('Close search button not found');
        }
    }

    /**
     * KEYBOARD SHORTCUTS: Set up advanced keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        const extraKeys = {
            // Search and replace shortcuts
            "Ctrl-F": (cm) => {
                const findInput = document.getElementById('find-input');
                if (findInput) {
                    findInput.focus();
                }
            },
            "Ctrl-H": (cm) => {
                const replaceInput = document.getElementById('replace-input');
                if (replaceInput) {
                    replaceInput.focus();
                }
            },
            "Esc": (cm) => {
                const findInput = document.getElementById('find-input');
                const replaceInput = document.getElementById('replace-input');
                if (findInput) findInput.value = '';
                if (replaceInput) replaceInput.value = '';
                if (this.searcher) {
                    this.searcher.clearSearch();
                }
            },

            // File operations
            "Ctrl-S": (cm) => {
                this.save();
                return false; // Prevent browser's default save dialog
            }
        };

        // Add formatting shortcuts if formatter is available
        if (this.formatter) {
            Object.assign(extraKeys, {
                "Ctrl-B": (cm) => this.formatter.format('bold'),
                "Ctrl-I": (cm) => this.formatter.format('italic'),
                "Ctrl-K": (cm) => this.formatter.format('link'),
                "Ctrl-Shift-C": (cm) => this.formatter.format('code'),
                "Ctrl-Shift-K": (cm) => this.formatter.format('codeblock'),
                "Ctrl-Shift-Q": (cm) => this.formatter.format('quote'),
                "Ctrl-1": (cm) => this.formatter.format('header1'),
                "Ctrl-2": (cm) => this.formatter.format('header2'),
                "Ctrl-3": (cm) => this.formatter.format('header3'),
                "Ctrl-4": (cm) => this.formatter.format('header4'),
                "Ctrl-5": (cm) => this.formatter.format('header5'),
                "Ctrl-6": (cm) => this.formatter.format('header6')
            });
        }

        // Extend existing extraKeys
        const currentExtraKeys = this.cmEditor.getOption('extraKeys') || {};
        this.cmEditor.setOption('extraKeys', { ...currentExtraKeys, ...extraKeys });
    }

    /**
     * CONTENT MANAGEMENT METHODS
     */

    /**
     * Get current editor content
     * @returns {string} Current editor content
     */
    getValue() {
        return this.cmEditor ? this.cmEditor.getValue() : '';
    }

    /**
     * Set editor content
     * @param {string} content - Content to set
     */
    setValue(content) {
        if (this.cmEditor) {
            this.cmEditor.setValue(content || '');
            this.cmEditor.setCursor(0, 0);
            this.cmEditor.clearHistory();
            
            if (this.livePreview) {
                this.livePreview.updatePreview();
            }
            
            this.lastSavedContent = content || '';
        }
    }

    /**
     * Check if content has been modified
     * @returns {boolean} True if content is modified
     */
    isModified() {
        return this.getValue() !== this.lastSavedContent;
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.cmEditor) {
            this.cmEditor.focus();
        }
    }

    /**
     * Save current content
     */
    save() {
        const content = this.getValue();
        this.lastSavedContent = content;
        
        if (this.options.onSave) {
            this.options.onSave(content);
        }
        
        // Trigger save through IDE controller if available
        if (window.ideController && window.ideController.saveFile) {
            window.ideController.saveFile();
        }
    }

    /**
     * UTILITY METHODS
     */

    /**
     * Show message in toolbar
     * @param {string} text - Message text
     * @param {string} type - Message type (success, fail, info, warning)
     * @param {number} duration - Duration in milliseconds
     */

    /**
     * Toggle live preview on/off
     * @returns {boolean} New preview state
     */
    togglePreview() {
        if (this.livePreview) {
            return this.livePreview.toggle();
        }
        return false;
    }

    /**
     * Get editor statistics
     * @returns {Object} Editor statistics
     */
    getStats() {
        const content = this.getValue();
        return {
            characters: content.length,
            charactersNoSpaces: content.replace(/\s/g, '').length,
            words: content.trim() ? content.trim().split(/\s+/).length : 0,
            lines: this.cmEditor ? this.cmEditor.lineCount() : 0,
            cursor: this.cmEditor ? this.cmEditor.getCursor() : null
        };
    }

    /**
     * CLEANUP AND DESTRUCTION
     */

    /**
     * Destroy the editor and clean up resources
     */
    destroy() {
        // Clean up components
        if (this.livePreview && this.livePreview.destroy) {
            this.livePreview.destroy();
        }
        
        if (this.searcher && this.searcher.destroy) {
            this.searcher.destroy();
        }

        // Clean up CodeMirror
        if (this.cmEditor) {
            this.cmEditor.toTextArea();
            this.cmEditor = null;
        }

        // Clear global references
        if (window.cmEditor === this.cmEditor) {
            window.cmEditor = null;
        }
        if (window.livePreview === this.livePreview) {
            window.livePreview = null;
        }
        if (window.formatter === this.formatter) {
            window.formatter = null;
        }
        if (window.searcher === this.searcher) {
            window.searcher = null;
        }

        // Clear component references
        this.livePreview = null;
        this.formatter = null;
        this.searcher = null;
        
        this.isInitialized = false;
    }

    showMessage(text, type = 'info', duration = 3000) {
        const eventData = { text, type, duration };
        this.emit('showMessage', eventData);
    }

    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.container.dispatchEvent(event);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.Editor = Editor;
}
