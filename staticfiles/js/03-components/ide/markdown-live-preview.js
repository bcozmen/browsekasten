/**
 * MARKDOWN LIVE PREVIEW COMPONENT
 * 
 * This component implements Obsidian-style live markdown preview for CodeMirror editors.
 * It can be used in any application that needs live markdown editing with preview.
 * 
 * Features:
 * - Real-time preview switching based on cursor position
 * - Configurable markdown rendering
 * - Widget-based overlay system
 * - Performance optimized with caching
 * 
 * Usage:
 * const livePreview = new MarkdownLivePreview(codeMirrorInstance, options);
 */
class MarkdownLivePreview {
    /**
     * CONSTRUCTOR: Initialize the live preview system
     * 
     * @param {CodeMirror} editor - The CodeMirror editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Start with preview enabled (default: true)
     * @param {Object} options.markdownOptions - Options for markdown parser
     * @param {string} options.widgetClass - CSS class for widgets (default: 'markdown-line-widget')
     */
    constructor(editor, options = {}) {
        this.editor = editor;
        this.currentCursorLine = -1;
        this.renderedLines = new Map();
        this.enabled = options.enabled !== false;
        this.widgetClass = options.widgetClass || 'markdown-line-widget markdown';
        
        // Configure markdown parser
        this.markdownOptions = {
            breaks: true,
            gfm: true,
            sanitize: false,
            ...options.markdownOptions
        };
        
        if (typeof marked !== 'undefined') {
            marked.setOptions(this.markdownOptions);
        }

        this.setupEventListeners();
        if (this.enabled) {
            this.updatePreview();
        }
    }

    /**
     * Enable live preview
     */
    enable() {
        this.enabled = true;
        this.updatePreview();
    }

    /**
     * Disable live preview and show only raw markdown
     */
    disable() {
        this.enabled = false;
        this.clearAllRendering();
    }

    /**
     * Toggle preview on/off
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.enabled;
    }

    /**
     * Clear all preview widgets and CSS classes
     */
    clearAllRendering() {
        const lineCount = this.editor.lineCount();
        for (let i = 0; i < lineCount; i++) {
            const lineHandle = this.editor.getLineHandle(i);
            
            if (lineHandle && lineHandle.widgets) {
                lineHandle.widgets.forEach(widget => widget.clear());
            }
            
            this.editor.removeLineClass(i, 'wrap', 'markdown-rendered');
            this.editor.removeLineClass(i, 'wrap', 'markdown-editing');
            this.editor.removeLineClass(i, 'text', 'hidden-line');
        }
        this.renderedLines.clear();
    }

    /**
     * Set up event listeners for editor events
     */
    setupEventListeners() {
        this.editor.on('cursorActivity', () => {
            if (this.enabled) this.updateCursorLine();
        });

        this.editor.on('change', () => {
            if (this.enabled) this.updatePreview();
        });

        this.editor.on('refresh', () => {
            if (this.enabled) this.updatePreview();
        });
    }

    /**
     * Handle cursor movement between lines
     */
    updateCursorLine() {
        const newCursorLine = this.editor.getCursor().line;
        
        if (newCursorLine !== this.currentCursorLine) {
            const oldLine = this.currentCursorLine;
            this.currentCursorLine = newCursorLine;
            
            if (oldLine >= 0) {
                this.renderLine(oldLine, false);
            }
            
            this.renderLine(this.currentCursorLine, true);
        }
    }

    /**
     * Update the entire preview
     */
    updatePreview() {
        const lineCount = this.editor.lineCount();
        
        for (let i = 0; i < lineCount; i++) {
            const isCurrentLine = i === this.currentCursorLine;
            this.renderLine(i, isCurrentLine);
        }
    }

    /**
     * Render a specific line
     * @param {number} lineNumber - Line number to render
     * @param {boolean} isEditing - Whether this line is being edited
     */
    renderLine(lineNumber, isEditing) {
        if (lineNumber < 0 || lineNumber >= this.editor.lineCount()) return;

        const lineHandle = this.editor.getLineHandle(lineNumber);
        if (!lineHandle) return;

        const lineText = this.editor.getLine(lineNumber);
        
        // Clear existing widgets
        if (lineHandle.widgets) {
            lineHandle.widgets.forEach(widget => widget.clear());
        }

        // Show raw markdown for current line or empty lines
        if (isEditing || !lineText.trim()) {
            this.editor.removeLineClass(lineNumber, 'wrap', 'markdown-rendered');
            this.editor.removeLineClass(lineNumber, 'text', 'hidden-line');
            this.editor.addLineClass(lineNumber, 'wrap', 'markdown-editing');
            return;
        }

        // Show rendered content for other lines
        this.editor.removeLineClass(lineNumber, 'wrap', 'markdown-editing');
        this.editor.addLineClass(lineNumber, 'wrap', 'markdown-rendered');

        const renderedContent = this.renderMarkdownLine(lineText);
        if (renderedContent && renderedContent !== lineText) {
            this.createLineWidget(lineNumber, renderedContent);
        }
    }

    /**
     * Convert markdown line to HTML
     * @param {string} text - Markdown text
     * @returns {string} - HTML output
     */
    renderMarkdownLine(text) {
        if (!text.trim()) return '';

        try {
            let rendered = text;

            // Headers
            if (text.match(/^#{1,6}\s/)) {
                const level = text.match(/^#+/)[0].length;
                const content = text.replace(/^#+\s/, '');
                rendered = `<h${level} class="markdown-header">${this.escapeHtml(content)}</h${level}>`;
            }
            // Bold + Italic
            else if (text.includes('***')) {
                rendered = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            }
            // Bold
            else if (text.includes('**') || text.includes('__')) {
                rendered = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/__(.*?)__/g, '<strong>$1</strong>');
            }
            // Italic
            else if (text.includes('*') || text.includes('_')) {
                rendered = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/_(.*?)_/g, '<em>$1</em>');
            }
            // Strikethrough
            else if (text.includes('~~')) {
                rendered = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
            }
            // Inline code
            else if (text.includes('`')) {
                rendered = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            }
            // Links
            else if (text.includes('[') && text.includes('](')) {
                rendered = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
            }
            // Bullet lists
            else if (text.match(/^[\s]*[-*+]\s/)) {
                const content = text.replace(/^[\s]*[-*+]\s/, '');
                rendered = `<li>${this.escapeHtml(content)}</li>`;
            }
            // Numbered lists
            else if (text.match(/^[\s]*\d+\.\s/)) {
                const content = text.replace(/^[\s]*\d+\.\s/, '');
                rendered = `<li>${this.escapeHtml(content)}</li>`;
            }
            // Blockquotes
            else if (text.match(/^>\s/)) {
                const content = text.replace(/^>\s/, '');
                rendered = `<blockquote><p>${this.escapeHtml(content)}</p></blockquote>`;
            }

            return rendered;
        } catch (error) {
            console.error('Error rendering markdown:', error);
            return text;
        }
    }

    /**
     * Escape HTML characters for security
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create a widget overlay for a line
     * @param {number} lineNumber - Line number
     * @param {string} renderedContent - HTML content
     */
    createLineWidget(lineNumber, renderedContent) {
        const widget = document.createElement('div');
        widget.className = this.widgetClass;
        widget.innerHTML = renderedContent;
        
        // Apply styling using CSS custom properties
        widget.style.cssText = `
            font-family: var(--font-family-body, inherit);
            line-height: var(--line-height-relaxed, 1.6);
            color: var(--text-primary, inherit);
            margin: 0;
            padding: 2px 0;
            background: transparent;
        `;

        this.editor.addLineClass(lineNumber, 'text', 'hidden-line');
        
        this.editor.addLineWidget(lineNumber, widget, {
            coverGutter: false,
            noHScroll: true,
            above: false
        });
    }

    /**
     * Destroy the live preview instance
     */
    destroy() {
        this.clearAllRendering();
        this.editor.off('cursorActivity');
        this.editor.off('change');
        this.editor.off('refresh');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownLivePreview;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.MarkdownLivePreview = MarkdownLivePreview;
}
