class EditorLivePreview {
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
        
        console.log('EditorLivePreview initialized with options:', options);
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

        //this.setupEventListeners();
        //if (this.enabled) {
            //this.updatePreview();
        //}
    }

    initPreview() {
        // Check if marked is available
        if (typeof marked === 'undefined') {
            console.error('Marked library not available');
            return;
        }
    
        // Get the entire editor content
        const content = this.editor.getValue();
        
        // Convert entire document to HTML using marked
        const fullHtml = marked.parse(content, this.markdownOptions);
        
        // Clear any existing rendering
        this.clearAllRendering();
        
        // Parse the HTML and map it back to editor lines
        this.renderFullDocument(content, fullHtml);
    
    }
    
    /**
     * Render the full document HTML by mapping it back to editor lines
     * @param {string} originalText - Original markdown text
     * @param {string} html - Full rendered HTML
     */
    renderFullDocument(originalText, html) {
        // Split original text into lines
        const lines = originalText.split('\n');
        this.currentCursorLine = this.editor.getCursor().line;
        
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // For now, we'll process line by line and try to match HTML elements
        // This is where you'll implement your full document -> line mapping logic
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const isCurrentLine = i === this.currentCursorLine;
            
            if (isCurrentLine || !lineText.trim()) {
                // Show raw markdown for current line or empty lines
                this.editor.removeLineClass(i, 'wrap', 'markdown-rendered');
                this.editor.removeLineClass(i, 'text', 'hidden-line');
                this.editor.addLineClass(i, 'wrap', 'markdown-editing');
            } else {
                // For non-current lines, we need to extract the corresponding HTML
                // This is where your mapping logic will go
                const htmlForLine = this.extractHtmlForLine(lineText, tempDiv, i);
                
                if (htmlForLine && htmlForLine !== lineText) {
                    this.editor.removeLineClass(i, 'wrap', 'markdown-editing');
                    this.editor.addLineClass(i, 'wrap', 'markdown-rendered');
                    this.createLineWidget(i, htmlForLine);
                }
            }
        }
    }
    
    /**
     * Extract HTML content that corresponds to a specific markdown line
     * @param {string} lineText - Original markdown line text
     * @param {HTMLElement} htmlContainer - Container with full rendered HTML
     * @param {number} lineNumber - Line number in editor
     * @returns {string} - HTML content for this line
     */
    extractHtmlForLine(lineText, htmlContainer, lineNumber) {
        // Placeholder implementation - you'll customize this logic
        // For now, just return the line processed with your existing logic
        return this.renderMarkdownLine(lineText);
    }

    updatePreview() {
        this.currentCursorLine = this.editor.getCursor().line;
        const lineCount = this.editor.lineCount();
        
        for (let i = 0; i < lineCount; i++) {
            const isCurrentLine = i === this.currentCursorLine;
            this.renderLine(i, isCurrentLine);
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

        this.editor.on('change', (cm, change) => {
            if (this.enabled) this.updateChangedLines(change);
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
     * Update only the lines that were changed
     * @param {Object} change - CodeMirror change object
     */
    updateChangedLines(change) {
        // Get the range of affected lines
        const fromLine = change.from.line;
        const toLine = change.to.line;
        const linesAdded = change.text.length - 1;
        const linesRemoved = toLine - fromLine;
        
        // If lines were added or removed, we need to update line numbers
        if (linesAdded !== linesRemoved) {
            // For simplicity, do a full update when lines are added/removed
            // This is still more efficient than the original approach for most edits
            this.updatePreview();
            return;
        }
        
        // Update only the affected lines
        const endLine = fromLine + Math.max(linesAdded, 1);
        for (let i = fromLine; i < endLine; i++) {
            const isCurrentLine = i === this.currentCursorLine;
            this.renderLine(i, isCurrentLine);
        }
    }

    /**
     * Update the entire preview (used for initialization and major changes)
     */
    

    /**
     * Update only the current line (most efficient for single-line edits)
     */
    updateCurrentLine() {
        const currentLine = this.editor.getCursor().line;
        this.renderLine(currentLine, true);
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
        
        // Clear existing widgets and markers
        if (lineHandle.widgets) {
            lineHandle.widgets.forEach(widget => widget.clear());
        }
        if (this.renderedLines.has(lineNumber)) {
            this.renderedLines.get(lineNumber).clear();
            this.renderedLines.delete(lineNumber);
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
     * Replace line content with rendered HTML (single line display)
     * @param {number} lineNumber - Line number
     * @param {string} renderedContent - HTML content
     */
    createLineWidget(lineNumber, renderedContent) {
        // Clear any existing markers on this line
        if (this.renderedLines.has(lineNumber)) {
            this.renderedLines.get(lineNumber).clear();
        }
        
        const lineText = this.editor.getLine(lineNumber);
        const from = { line: lineNumber, ch: 0 };
        const to = { line: lineNumber, ch: lineText.length };
        
        // Create replacement element
        const widget = document.createElement('span');
        widget.className = this.widgetClass;
        widget.innerHTML = renderedContent;

        // Replace the entire line content with rendered HTML
        const marker = this.editor.markText(from, to, {
            replacedWith: widget,
            clearOnEnter: false,
            handleMouseEvents: true
        });
        
        // Store marker for cleanup
        this.renderedLines.set(lineNumber, marker);
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
    module.exports = EditorLivePreview;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.EditorLivePreview = EditorLivePreview;
}
