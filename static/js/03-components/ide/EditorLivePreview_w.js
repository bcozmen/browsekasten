class EditorLivePreview {
    constructor(editor, options = {}) {
        this.editor = editor;
        this.widgetClass = options.widgetClass || 'markdown-widget';
        
        // Map to track which line handles have text markers
        // lineHandle -> CodeMirror text marker
        this.markers = new Map();
        
        // Track current cursor line
        this.currentCursorLine = -1;
        
        // Set up cursor tracking
        this.setupCursorTracking();
    }

    /**
     * STEP 4: Process the entire document
     */
    initPreview() {
        const lineCount = this.editor.lineCount();
        this.currentCursorLine = this.editor.getCursor().line;
        
        // Process every line
        for (let i = 0; i < lineCount; i++) {
            this.renderLine(i);
        }
    }

    /**
     * Set up cursor tracking for active line detection
     */
    setupCursorTracking() {
        this.editor.on('cursorActivity', () => {
            const newCursorLine = this.editor.getCursor().line;
            
            if (newCursorLine !== this.currentCursorLine) {
                const oldLine = this.currentCursorLine;
                this.currentCursorLine = newCursorLine;
                
                // Update old line (show widget if it has markdown content)
                if (oldLine >= 0) {
                    this.renderLine(oldLine);
                }
                
                // Update new line (show raw content)
                this.renderLine(this.currentCursorLine);
            }
        });
    }

    /**
     * STEP 1: Convert markdown text to HTML
     * This is our core rendering function
     */
    markdownToHtml(text) {
        if (!text.trim()) return '';
        
        // Simple markdown parsing (we'll expand this)
        let html = text;
        
        // Headers: # Header -> <h1>Header</h1> (no <p> wrapper)
        // Also handles custom IDs: # Header {#custom-id}
        if (text.match(/^#{1,6}\s/)) {
            const level = text.match(/^#+/)[0].length;
            let content = text.replace(/^#+\s*/, '');
            
            // Check for custom ID in format {#custom-id}
            let customId = '';
            const idMatch = content.match(/\s*\{#([^}]+)\}\s*$/);
            if (idMatch) {
                customId = idMatch[1];
                content = content.replace(/\s*\{#[^}]+\}\s*$/, ''); // Remove the ID from content
            }
            
            // Create header with or without custom ID
            if (customId) {
                html = `<h${level} id="${customId}">${content}</h${level}>`;
            } else {
                html = `<h${level}>${content}</h${level}>`;
            }
        }
        // Code blocks: ``` (no <p> wrapper)
        else if (text.match(/^```/)) {
            const language = text.replace(/^```/, '').trim();
            html = `<pre><code class="language-${language}">${text}</code></pre>`;
        }
        // Blockquotes: > text (keep <p> inside blockquote)
        else if (text.match(/^>\s/)) {
            const content = text.replace(/^>\s/, '');
            html = `<blockquote><p>${content}</p></blockquote>`;
        }
        // Unordered lists: - item or * item (keep <p> inside li)
        else if (text.match(/^[\s]*[-*+]\s/)) {
            const content = text.replace(/^[\s]*[-*+]\s/, '');
            const indent = text.match(/^[\s]*/)[0].length;
            html = `<ul><li><p>${content}</p></li></ul>`;
        }
        // Ordered lists: 1. item (keep <p> inside li)
        else if (text.match(/^[\s]*\d+\.\s/)) {
            const content = text.replace(/^[\s]*\d+\.\s/, '');
            const indent = text.match(/^[\s]*/)[0].length;
            html = `<ol><li><p>${content}</p></li></ol>`;
        }
        // Process inline formatting and wrap in <p>
        else {
            // Apply inline formatting first
            // Inline code: `code`
            if (text.includes('`')) {
                html = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            }
            // Bold + Italic: ***text***
            if (html.includes('***')) {
                html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            }
            // Bold: **text** -> <strong>text</strong>
            if (html.includes('**')) {
                html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            // Italic: *text* -> <em>text</em>
            if (html.includes('*')) {
                html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
            }
            // Strikethrough: ~~text~~
            if (html.includes('~~')) {
                html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
            }
            
            // Wrap everything in <p> tag
            html = `<p>${html}</p>`;
        }
        
        return html;
    }

    renderLine(lineNumber) {
        const rawText = this.editor.getLine(lineNumber);
        if (!rawText.trim()) return;
        
        // Get the line handle (persistent object that stays with the line)
        const lineHandle = this.editor.getLineHandle(lineNumber);
        
        // If this is the cursor line, show raw text (remove marker if exists)
        if (lineNumber === this.currentCursorLine) {
            this.clearLineMarker(lineHandle);
            return;
        }
        
        //const html = this.markdownToHtml(rawText);
        //console.log(`Rendering line ${lineNumber}:`, html);
        //this.createLineMarker(lineNumber, lineHandle, rawText);
    }

    /**
     * Check if a line contains markdown that should be rendered
     */
    isMarkdownLine(text) {
        if (!text.trim()) return false;
        
        // Check for common markdown patterns
        return text.match(/^#{1,6}\s/) ||        // Headers
               text.match(/^>\s/) ||             // Blockquotes  
               text.match(/^[\s]*[-*+]\s/) ||    // Unordered lists
               text.match(/^[\s]*\d+\.\s/) ||    // Ordered lists
               text.match(/^```/) ||             // Code blocks
               text.includes('`') ||             // Inline code
               text.includes('**') ||            // Bold
               text.includes('*') ||             // Italic
               text.includes('~~') ||            // Strikethrough
               text.match(/^---+$/);             // Horizontal rule
    }

    createLineMarker(lineNumber, lineHandle, renderedContent) {
        // Clear existing marker first
        this.editor.replaceRange(
        renderedContent,
        { line: lineNumber, ch: 0 },
        { line: lineNumber, ch: this.editor.getLine(lineNumber).length }
        );

    }

    createLineMarkerDiv(lineNumber, lineHandle, renderedContent) {
        // Clear existing marker first
        this.clearLineMarker(lineHandle);
        
        // Create widget element
        const widgetElement = document.createElement('div');
        widgetElement.className = this.widgetClass;
        widgetElement.innerHTML = renderedContent;
        widgetElement.style.cursor = 'text';
        
        // Get line positions
        const from = { line: lineNumber, ch: 0 };
        const to = { line: lineNumber, ch: this.editor.getLine(lineNumber).length };
        
        // Create text marker that replaces the line content
        const marker = this.editor.markText(from, to, {
            replacedWith: widgetElement,
            clearOnEnter: false,
            handleMouseEvents: true
        });
        
        // Store marker using line handle as key (persistent across line number changes)
        this.markers.set(lineHandle, marker);
    }

    clearLineMarker(lineHandle) {
        // Remove marker if it exists
        if (this.markers.has(lineHandle)) {
            const marker = this.markers.get(lineHandle);
            marker.clear(); // Remove the marker from CodeMirror
            this.markers.delete(lineHandle);
        }
    }





    /**
     * STEP 5: Clean up everything
     */
    clearAllRendering() {
        console.log('Clearing all previews...');
        
        // Clear all markers
        for (let [lineHandle, marker] of this.markers) {
            marker.clear();
        }
        this.markers.clear();
    }

    /**
     * Helper method to show raw line and hide preview
     */
    showLineAndHidePreview(lineNumber) {
        const lineHandle = this.editor.getLineHandle(lineNumber);
        this.clearLineMarker(lineHandle);
    }

    /**
     * Toggle between preview and source mode
     */
    toggle() {
        console.log('Toggling preview mode...');
        if (this.markers.size > 0) {
            // Currently showing preview -> show source
            this.clearAllRendering();
            console.log('debug Switched to source mode');
            return false;
        } else {
            // Currently showing source -> show preview
            this.initPreview();
            return true;
        }
    }

    destroy() {
        this.clearAllRendering();
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
