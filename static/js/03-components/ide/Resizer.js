class Resizer {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = { minWidth: 150, maxWidth: 400, ...options };
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        this.currentLeftPanel = null;
        
        this.init();
    }

    init() {
        // Find all direct child resizers
        const resizers = Array.from(this.container.children).filter(child => 
            child.classList.contains('resizer')
        );
        
        resizers.forEach(resizer => {
            const leftPanel = resizer.previousElementSibling;
            if (leftPanel) {
                resizer.addEventListener('mousedown', (e) => this.startResize(e, leftPanel));
            }
        });

        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
    }

    startResize(e, leftPanel) {
        this.isResizing = true;
        this.currentLeftPanel = leftPanel;
        this.startX = e.clientX;
        this.startWidth = leftPanel.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    }

    doResize(e) {
        if (!this.isResizing || !this.currentLeftPanel) return;
        
        const newWidth = Math.max(
            this.options.minWidth,
            Math.min(this.options.maxWidth, this.startWidth + (e.clientX - this.startX))
        );
        
        this.currentLeftPanel.style.width = `${newWidth}px`;
    }

    stopResize() {
        this.isResizing = false;
        this.currentLeftPanel = null;
        document.body.style.cursor = '';
    }
}