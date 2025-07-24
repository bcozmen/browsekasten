/**
 * =====================================================================================
 * EditorFactory.js - Integrated Editor Instance Factory
 * =====================================================================================
 * 
 * OVERVIEW:
 * Factory class that creates fully-integrated CodeMirror editor instances with
 * all IDE components pre-configured and connected. Each editor comes with live
 * preview, formatting, search, auto-save, and other advanced features.
 * 
 * ARCHITECTURE:
 * - Editor Creation: Factory pattern for consistent editor instances
 * - Component Integration: Automatic setup of all editor components
 * - Configuration Management: Centralized configuration with per-editor overrides
 * - Lifecycle Management: Handles editor creation, configuration, and cleanup
 * - Theme Management: Consistent theming across all editors
 * 
 * FEATURES:
 * - CodeMirror integration with optimized configuration
 * - Live preview system (Obsidian-style cursor line rendering)
 * - Markdown formatting toolbar with keyboard shortcuts
 * - Advanced search and replace functionality
 * - Auto-save with configurable delays
 * - Syntax highlighting for multiple languages
 * - Code folding and bracket matching
 * - Multi-cursor support and advanced editing
 * - Theme management and customization
 * - Plugin integration capabilities
 * 
 * EDITOR COMPONENTS INCLUDED:
 * - MarkdownLivePreview: Real-time markdown rendering
 * - MarkdownFormatter: Text formatting and toolbar
 * - EditorSearcher: Search and replace functionality
 * - Auto-save system with change detection
 * - Keyboard shortcut integration
 * - Toolbar generation and event handling
 * 
 * CONFIGURATION OPTIONS:
 * - theme: CodeMirror theme name (default: 'mytheme')
 * - mode: Editor mode/language (default: 'markdown')
 * - enableLivePreview: Enable live preview (default: true)
 * - enableFormatter: Enable formatting toolbar (default: true)
 * - enableSearch: Enable search functionality (default: true)
 * - autoSave: Enable auto-save (default: true)
 * - autoSaveDelay: Auto-save delay in ms (default: 1000)
 * - lineNumbers: Show line numbers (default: true)
 * - lineWrapping: Enable line wrapping (default: true)
 * - styleActiveLine: Highlight active line (default: true)
 * 
 * USAGE:
 * ```javascript
 * const factory = new EditorFactory({
 *     theme: 'dark',
 *     enableLivePreview: true,
 *     autoSaveDelay: 2000
 * });
 * 
 * // Create editor for a tab
 * const editor = factory.createEditor('tab-123', 'Initial content', {
 *     mode: 'javascript'  // Override default mode
 * });
 * 
 * // Get existing editor
 * const existingEditor = factory.getEditor('tab-123');
 * 
 * // Destroy editor when tab is closed
 * factory.destroyEditor('tab-123');
 * ```
 * 
 * EDITOR INSTANCE PROPERTIES:
 * - cm: CodeMirror instance
 * - livePreview: Live preview component
 * - formatter: Formatting component
 * - searcher: Search component
 * - container: DOM container element
 * - tabId: Associated tab ID
 * - isDirty: Has unsaved changes
 * - lastSaved: Timestamp of last save
 * 
 * KEYBOARD SHORTCUTS (per editor):
 * - Ctrl+B: Bold
 * - Ctrl+I: Italic
 * - Ctrl+K: Insert link
 * - Ctrl+F: Find
 * - Ctrl+H: Find and replace
 * - Ctrl+S: Save
 * - Ctrl+Z: Undo
 * - Ctrl+Y: Redo
 * 
 * DEPENDENCIES:
 * - CodeMirror library and addons
 * - MarkdownLivePreview class
 * - MarkdownFormatter class
 * - EditorSearcher class
 * - marked.js for markdown parsing
 * 
 * PERFORMANCE NOTES:
 * - Editors are created on-demand to optimize memory usage
 * - Inactive editors can be suspended to improve performance
 * - Auto-save is debounced to prevent excessive API calls
 * =====================================================================================
 */

class EditorFactory {
    constructor(options = {}) {
        this.options = {
            theme: 'mytheme',
            mode: 'markdown',
            enableLivePreview: true,
            enableFormatter: true,
            enableSearch: true,
            autoSave: true,
            autoSaveDelay: 1000,
            ...options
        };

        // Track all created editors
        this.editors = new Map(); // editor id -> editor instance
        this.activeEditor = null;
    }

    /**
     * Create a fully-featured editor instance for a tab
     */
    createEditor(tabId, content = '', options = {}) {
        const editorOptions = { ...this.options, ...options };

        // Create textarea element for CodeMirror
        const textarea = document.createElement('textarea');
        textarea.value = content;

        // Create CodeMirror instance
        const cm = CodeMirror.fromTextArea(textarea, {
            mode: editorOptions.mode,
            theme: editorOptions.theme,
            lineNumbers: true,
            lineWrapping: true,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            inputStyle: "contenteditable",
            spellcheck: true,
            keyMap: "sublime",
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-Q": function(cm) { cm.foldCode(cm.getCursor()); },
                "Ctrl-F": function(cm) { 
                    if (cm.editorSearch) {
                        cm.editorSearch.show();
                    }
                },
                "Ctrl-H": function(cm) { 
                    if (cm.editorSearch) {
                        cm.editorSearch.showReplace();
                    }
                },
                "Ctrl-B": function(cm) { 
                    if (cm.markdownFormatter) {
                        cm.markdownFormatter.format('bold');
                    }
                },
                "Ctrl-I": function(cm) { 
                    if (cm.markdownFormatter) {
                        cm.markdownFormatter.format('italic');
                    }
                },
                "Ctrl-S": function(cm) {
                    if (cm.editorInstance && cm.editorInstance.onSave) {
                        cm.editorInstance.onSave();
                    }
                }
            },
            hintOptions: {
                hint: CodeMirror.hint.anyword
            }
        });

        // Create editor wrapper with additional functionality
        const editorInstance = {
            id: tabId,
            cm: cm,
            element: cm.getWrapperElement(),
            isModified: false,
            lastSavedContent: content,
            autoSaveTimer: null,
            
            // Component instances
            livePreview: null,
            formatter: null,
            searcher: null,

            // Event handlers
            onChange: null,
            onSave: null,
            onFocus: null,
            onBlur: null,

            // API methods
            getValue: () => cm.getValue(),
            setValue: (value) => {
                cm.setValue(value);
                editorInstance.lastSavedContent = value;
                editorInstance.markClean();
            },
            focus: () => cm.focus(),
            refresh: () => cm.refresh(),
            markClean: () => {
                editorInstance.isModified = false;
                if (editorInstance.onChange) {
                    editorInstance.onChange(false);
                }
            },
            markDirty: () => {
                editorInstance.isModified = true;
                if (editorInstance.onChange) {
                    editorInstance.onChange(true);
                }
            },
            destroy: () => {
                if (editorInstance.autoSaveTimer) {
                    clearTimeout(editorInstance.autoSaveTimer);
                }
                if (editorInstance.livePreview) {
                    editorInstance.livePreview.destroy();
                }
                cm.toTextArea();
            }
        };

        // Initialize components
        this.initializeComponents(editorInstance, editorOptions);

        // Set up change tracking
        cm.on('change', () => {
            editorInstance.markDirty();
            
            // Auto-save functionality
            if (editorOptions.autoSave) {
                this.scheduleAutoSave(editorInstance);
            }
        });

        // Set up focus/blur tracking
        cm.on('focus', () => {
            this.activeEditor = editorInstance;
            if (editorInstance.onFocus) {
                editorInstance.onFocus();
            }
        });

        cm.on('blur', () => {
            if (editorInstance.onBlur) {
                editorInstance.onBlur();
            }
        });

        // Store reference
        cm.editorInstance = editorInstance;
        this.editors.set(tabId, editorInstance);

        return editorInstance;
    }

    initializeComponents(editorInstance, options) {
        const cm = editorInstance.cm;

        // Initialize Live Preview
        if (options.enableLivePreview && window.MarkdownLivePreview) {
            editorInstance.livePreview = new MarkdownLivePreview(cm, {
                enabled: true,
                widgetClass: 'markdown-line-widget markdown'
            });
            cm.livePreview = editorInstance.livePreview;
        }

        // Initialize Formatter
        if (options.enableFormatter && window.MarkdownFormatter) {
            editorInstance.formatter = new MarkdownFormatter(cm);
            cm.markdownFormatter = editorInstance.formatter;
        }

        // Initialize Search
        if (options.enableSearch && window.EditorSearcher) {
            editorInstance.searcher = new EditorSearcher(cm, {
                caseSensitive: false,
                highlightClass: 'searching'
            });
            cm.editorSearch = editorInstance.searcher;
        }
    }

    scheduleAutoSave(editorInstance) {
        if (editorInstance.autoSaveTimer) {
            clearTimeout(editorInstance.autoSaveTimer);
        }

        editorInstance.autoSaveTimer = setTimeout(() => {
            if (editorInstance.isModified && editorInstance.onSave) {
                const currentContent = editorInstance.getValue();
                if (currentContent !== editorInstance.lastSavedContent) {
                    editorInstance.onSave(true); // true = auto-save
                }
            }
        }, this.options.autoSaveDelay);
    }

    /**
     * Get editor instance by tab ID
     */
    getEditor(tabId) {
        return this.editors.get(tabId);
    }

    /**
     * Remove and cleanup editor
     */
    removeEditor(tabId) {
        const editor = this.editors.get(tabId);
        if (editor) {
            editor.destroy();
            this.editors.delete(tabId);
            
            if (this.activeEditor === editor) {
                this.activeEditor = null;
            }
        }
    }

    /**
     * Get the currently active editor
     */
    getActiveEditor() {
        return this.activeEditor;
    }

    /**
     * Switch focus to specific editor
     */
    focusEditor(tabId) {
        const editor = this.getEditor(tabId);
        if (editor) {
            editor.focus();
        }
    }

    /**
     * Create editor toolbar with all formatting options
     */
    createToolbar(editorInstance) {
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        
        const buttons = [
            { cmd: 'bold', title: 'Bold (Ctrl+B)', icon: 'B' },
            { cmd: 'italic', title: 'Italic (Ctrl+I)', icon: 'I' },
            { cmd: 'strikethrough', title: 'Strikethrough', icon: 'S' },
            { cmd: 'separator' },
            { cmd: 'heading1', title: 'Heading 1', icon: 'H1' },
            { cmd: 'heading2', title: 'Heading 2', icon: 'H2' },
            { cmd: 'heading3', title: 'Heading 3', icon: 'H3' },
            { cmd: 'separator' },
            { cmd: 'quote', title: 'Quote', icon: '"' },
            { cmd: 'code', title: 'Code', icon: '<>' },
            { cmd: 'codeblock', title: 'Code Block', icon: '{}' },
            { cmd: 'separator' },
            { cmd: 'link', title: 'Link', icon: '🔗' },
            { cmd: 'image', title: 'Image', icon: '🖼️' },
            { cmd: 'separator' },
            { cmd: 'unordered-list', title: 'Bullet List', icon: '•' },
            { cmd: 'ordered-list', title: 'Numbered List', icon: '1.' },
            { cmd: 'separator' },
            { cmd: 'table', title: 'Table', icon: '⊞' },
            { cmd: 'horizontal-rule', title: 'Horizontal Rule', icon: '─' },
            { cmd: 'separator' },
            { cmd: 'toggle-preview', title: 'Toggle Live Preview', icon: '👁️' }
        ];

        buttons.forEach(btn => {
            if (btn.cmd === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'toolbar-separator';
                toolbar.appendChild(sep);
            } else {
                const button = document.createElement('button');
                button.className = 'toolbar-btn';
                button.title = btn.title;
                button.textContent = btn.icon;
                button.dataset.cmd = btn.cmd;
                
                button.addEventListener('click', () => {
                    if (btn.cmd === 'toggle-preview' && editorInstance.livePreview) {
                        const isEnabled = editorInstance.livePreview.toggle();
                        button.classList.toggle('active', isEnabled);
                    } else if (editorInstance.formatter) {
                        editorInstance.formatter.format(btn.cmd);
                        editorInstance.focus();
                    }
                });
                
                toolbar.appendChild(button);
            }
        });

        return toolbar;
    }

    /**
     * Apply theme to all editors
     */
    setTheme(themeName) {
        this.options.theme = themeName;
        this.editors.forEach(editor => {
            editor.cm.setOption('theme', themeName);
        });
    }

    /**
     * Enable/disable live preview for all editors
     */
    setLivePreviewEnabled(enabled) {
        this.options.enableLivePreview = enabled;
        this.editors.forEach(editor => {
            if (editor.livePreview) {
                editor.livePreview.setEnabled(enabled);
            }
        });
    }

    /**
     * Get statistics about all editors
     */
    getStats() {
        return {
            totalEditors: this.editors.size,
            activeEditor: this.activeEditor?.id || null,
            modifiedEditors: Array.from(this.editors.values())
                .filter(e => e.isModified)
                .map(e => e.id)
        };
    }

    /**
     * Cleanup all editors
     */
    destroy() {
        this.editors.forEach(editor => editor.destroy());
        this.editors.clear();
        this.activeEditor = null;
    }
}

// Export for use in other modules
window.EditorFactory = EditorFactory;
