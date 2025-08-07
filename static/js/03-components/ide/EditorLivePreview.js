class EditorLivePreview {
    constructor(editor, options = {}) {
        this.editor = editor;
        this.widgetClass = options.widgetClass || 'markdown-widget';
        
        // lineHandle -> CodeMirror text marker
        this.markers = new Map();
        
        // Track current cursor line
        this.currentCursorLine = -1;
        this.setupCursorTracking();   
    }


    initPreview() {
        const lineCount = this.editor.lineCount();
        this.currentCursorLine = this.editor.getCursor().line;
        
        // Process every line
        for (let i = 0; i < lineCount; i++) {
            this.initLine(i);
        }
        this.activateLine(this.currentCursorLine);
    }

    initLine(line) {
        const lineHandle = this.editor.getLineHandle(line);
        const text = this.editor.getLine(line);

        // Create a new widget for the line
        const widget = this.createWidget(text);
        this.editor.addLineWidget(lineHandle, widget);

        widget.addEventListener('click', () => {
            this.editor.setCursor({ line: line, ch: 0 });
            this.editor.focus();
        });

        // Store the marker for later reference
        this.markers.set(lineHandle, widget);
    }

    createWidget(text, line) {
    const widget = document.createElement('div');
    widget.className = this.widgetClass;
    widget.style.cursor = 'pointer';

    // Split text into spans for each character
    widget.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.textContent = text[i];
        charSpan.dataset.ch = i;
        charSpan.addEventListener('click', (e) => {
            this.editor.setCursor({ line: line, ch: i });
            this.editor.focus();
            e.stopPropagation();
        });
        widget.appendChild(charSpan);
    }

    return widget;
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

                this.deactivateLine(oldLine);
                this.activateLine(this.currentCursorLine);
            }
        });
    }

    activateLine(line) {
        const lineHandle = this.editor.getLineHandle(line);
    }

    deactivateLine(line) {
        const lineHandle = this.editor.getLineHandle(line);
    }



    /**
     * Toggle between preview and source mode
     */
    toggle() {
        console.log('Toggling preview mode...');
    }

    destroy() {
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
