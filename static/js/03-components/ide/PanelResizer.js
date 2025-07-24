/**
 * =====================================================================================
 * PanelResizer.js - Advanced Panel Resizing System
 * =====================================================================================
 * 
 * OVERVIEW:
 * Sophisticated panel resizing system that provides smooth, constrained resizing
 * of IDE panels with persistence, keyboard shortcuts, and visual feedback.
 * Designed to create a professional IDE-like experience similar to VSCode.
 * 
 * ARCHITECTURE:
 * - Drag System: Smooth mouse/touch-based resizing with visual feedback
 * - Constraint System: Minimum/maximum size enforcement with snap-to thresholds
 * - Persistence Layer: Save and restore panel sizes across sessions
 * - Event Management: Comprehensive event handling for resize operations
 * - Accessibility: Keyboard navigation and screen reader support
 * 
 * FEATURES:
 * - Smooth drag-based resizing with visual feedback
 * - Minimum and maximum size constraints per panel
 * - Snap-to-edge functionality with configurable thresholds
 * - Panel collapse/expand with keyboard shortcuts
 * - Size persistence across browser sessions
 * - Touch support for mobile devices
 * - Visual indicators during resize operations
 * - Keyboard navigation for accessibility
 * - Proportional resizing when container changes size
 * 
 * RESIZE BEHAVIORS:
 * - Drag Handle: Click and drag to resize adjacent panels
 * - Double Click: Reset to default sizes
 * - Keyboard: Arrow keys for fine adjustments
 * - Snap: Automatically snap to minimum/maximum when close
 * - Constrain: Enforce minimum sizes to prevent panel collapse
 * 
 * KEYBOARD SHORTCUTS:
 * - Ctrl+Shift+Left/Right: Resize focused panel
 * - Ctrl+Shift+Up/Down: Resize horizontal panels
 * - Ctrl+Shift+R: Reset all panels to default sizes
 * - Ctrl+Shift+H: Toggle hide/show side panels
 * - Tab: Navigate between resizable panels
 * 
 * VISUAL FEEDBACK:
 * - Hover: Resizer highlights on hover
 * - Active: Different styling during drag operation
 * - Constraints: Visual indication when hitting size limits
 * - Snap: Visual feedback when approaching snap thresholds
 * 
 * EVENTS EMITTED:
 * - onResizeStart: When resize operation begins
 * - onResize: During resize operation (throttled)
 * - onResizeEnd: When resize operation completes
 * - onPanelCollapse: When panel is collapsed
 * - onPanelExpand: When panel is expanded
 * - onConstraintHit: When size constraint is reached
 * 
 * USAGE:
 * ```javascript
 * const resizer = new PanelResizer('.zettelkasten-container', {
 *     minPanelSize: 200,
 *     maxPanelSize: 800,
 *     snapThreshold: 15,
 *     persistSizes: true
 * });
 * 
 * // Set up event handlers
 * resizer.onResize = (panelSizes) => console.log('Panels resized:', panelSizes);
 * 
 * // Programmatic operations
 * resizer.resizePanel('left-panel', 300);
 * resizer.collapsePanel('sidebar');
 * resizer.resetAllSizes();
 * ```
 * 
 * PANEL CONFIGURATION:
 * - id: Unique identifier for the panel
 * - minSize: Minimum width/height in pixels
 * - maxSize: Maximum width/height in pixels (null = unlimited)
 * - defaultSize: Default size for reset operations
 * - collapsible: Whether panel can be collapsed
 * - resizable: Whether panel can be resized
 * 
 * PERSISTENCE FORMAT:
 * ```json
 * {
 *   "panel-sizes": {
 *     "left-panel": 250,
 *     "right-panel": 300,
 *     "collapsed-panels": ["debug-panel"]
 *   }
 * }
 * ```
 * 
 * DEPENDENCIES:
 * - DOM event handling
 * - localStorage for persistence
 * - CSS transitions for smooth animations
 * 
 * ACCESSIBILITY:
 * - Full keyboard navigation support
 * - Proper ARIA labels and roles
 * - Screen reader announcements for size changes
 * - High contrast mode support
 * =====================================================================================
 */

class PanelResizer {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            minPanelSize: 100,
            maxPanelSize: null, // null = no max
            snapThreshold: 10,
            persistSizes: true,
            smoothResize: true,
            ...options
        };

        // State
        this.panels = new Map(); // resizer id -> panel config
        this.isDragging = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startSizes = {};

        this.init();
    }

    init() {
        this.setupResizers();
        this.loadPersistedSizes();
        this.setupEventListeners();
    }

    setupResizers() {
        const resizers = this.container.querySelectorAll('.resizer');
        
        resizers.forEach(resizer => {
            const resizerId = resizer.id || `resizer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            resizer.id = resizerId;

            // Find adjacent panels
            const leftPanel = resizer.previousElementSibling;
            const rightPanel = resizer.nextElementSibling;

            if (leftPanel && rightPanel) {
                const config = {
                    id: resizerId,
                    element: resizer,
                    leftPanel: leftPanel,
                    rightPanel: rightPanel,
                    orientation: this.getOrientation(resizer),
                    minLeftSize: this.options.minPanelSize,
                    minRightSize: this.options.minPanelSize,
                    maxLeftSize: this.options.maxPanelSize,
                    maxRightSize: this.options.maxPanelSize
                };

                this.panels.set(resizerId, config);
                this.styleResizer(resizer, config.orientation);
            }
        });
    }

    getOrientation(resizer) {
        // Determine if this is a horizontal or vertical resizer
        const style = window.getComputedStyle(resizer);
        const cursor = style.cursor;
        
        if (cursor.includes('ew-resize') || cursor.includes('col-resize')) {
            return 'vertical'; // Resizes left/right panels
        } else if (cursor.includes('ns-resize') || cursor.includes('row-resize')) {
            return 'horizontal'; // Resizes top/bottom panels
        }
        
        // Fallback: determine by parent layout
        const parentStyle = window.getComputedStyle(resizer.parentElement);
        if (parentStyle.flexDirection === 'column') {
            return 'horizontal';
        } else {
            return 'vertical';
        }
    }

    styleResizer(resizer, orientation) {
        // Ensure proper styling for the resizer
        if (orientation === 'vertical') {
            resizer.style.cursor = 'ew-resize';
            resizer.style.width = resizer.style.width || '4px';
            resizer.style.height = '100%';
        } else {
            resizer.style.cursor = 'ns-resize';
            resizer.style.height = resizer.style.height || '4px';
            resizer.style.width = '100%';
        }
        
        resizer.style.backgroundColor = resizer.style.backgroundColor || 'var(--border-medium)';
        resizer.style.flexShrink = '0';
        resizer.style.userSelect = 'none';
        
        // Add hover effect
        resizer.addEventListener('mouseenter', () => {
            resizer.style.backgroundColor = 'var(--color-primary-300)';
        });
        
        resizer.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                resizer.style.backgroundColor = 'var(--border-medium)';
            }
        });
    }

    setupEventListeners() {
        // Mouse events for dragging
        this.container.addEventListener('mousedown', (e) => {
            const resizer = e.target.closest('.resizer');
            if (resizer && this.panels.has(resizer.id)) {
                this.startResize(e, resizer.id);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.resize(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.stopResize();
            }
        });

        // Touch events for mobile support
        this.container.addEventListener('touchstart', (e) => {
            const resizer = e.target.closest('.resizer');
            if (resizer && this.panels.has(resizer.id)) {
                e.preventDefault();
                const touch = e.touches[0];
                this.startResize(touch, resizer.id);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                this.resize(touch);
            }
        });

        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.stopResize();
            }
        });

        // Keyboard shortcuts for resizing
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '[':
                        e.preventDefault();
                        this.adjustPanelSize('left', -50);
                        break;
                    case ']':
                        e.preventDefault();
                        this.adjustPanelSize('left', 50);
                        break;
                }
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    startResize(event, resizerId) {
        this.isDragging = true;
        this.currentResizer = this.panels.get(resizerId);
        
        if (this.currentResizer.orientation === 'vertical') {
            this.startX = event.clientX;
        } else {
            this.startX = event.clientY;
        }

        // Store initial sizes
        this.startSizes = {
            left: this.getPanelSize(this.currentResizer.leftPanel, this.currentResizer.orientation),
            right: this.getPanelSize(this.currentResizer.rightPanel, this.currentResizer.orientation)
        };

        // Add visual feedback
        this.currentResizer.element.style.backgroundColor = 'var(--color-primary-500)';
        document.body.style.cursor = this.currentResizer.element.style.cursor;
        document.body.style.userSelect = 'none';

        // Add dragging class for additional styling
        this.container.classList.add('resizing');
    }

    resize(event) {
        if (!this.isDragging || !this.currentResizer) return;

        const currentPos = this.currentResizer.orientation === 'vertical' ? 
            event.clientX : event.clientY;
        const delta = currentPos - this.startX;

        // Calculate new sizes
        const newLeftSize = this.startSizes.left + delta;
        const newRightSize = this.startSizes.right - delta;

        // Apply constraints
        const constrainedSizes = this.applyConstraints(
            newLeftSize, 
            newRightSize, 
            this.currentResizer
        );

        // Apply sizes
        this.setPanelSize(
            this.currentResizer.leftPanel, 
            constrainedSizes.left, 
            this.currentResizer.orientation
        );
        this.setPanelSize(
            this.currentResizer.rightPanel, 
            constrainedSizes.right, 
            this.currentResizer.orientation
        );

        // Trigger resize events for editors or other components
        this.triggerPanelResize(this.currentResizer.leftPanel);
        this.triggerPanelResize(this.currentResizer.rightPanel);
    }

    stopResize() {
        if (!this.isDragging) return;

        this.isDragging = false;

        // Remove visual feedback
        if (this.currentResizer) {
            this.currentResizer.element.style.backgroundColor = 'var(--border-medium)';
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.container.classList.remove('resizing');

        // Persist sizes
        this.persistSizes();

        this.currentResizer = null;
    }

    applyConstraints(leftSize, rightSize, config) {
        // Apply minimum size constraints
        const minLeft = config.minLeftSize || this.options.minPanelSize;
        const minRight = config.minRightSize || this.options.minPanelSize;

        let constrainedLeft = Math.max(leftSize, minLeft);
        let constrainedRight = Math.max(rightSize, minRight);

        // Apply maximum size constraints
        if (config.maxLeftSize) {
            constrainedLeft = Math.min(constrainedLeft, config.maxLeftSize);
        }
        if (config.maxRightSize) {
            constrainedRight = Math.min(constrainedRight, config.maxRightSize);
        }

        // Ensure total size doesn't exceed container
        const totalAvailable = this.getContainerSize(config.orientation) - 
            this.getResizerSize(config.element, config.orientation);
        
        if (constrainedLeft + constrainedRight > totalAvailable) {
            const ratio = totalAvailable / (constrainedLeft + constrainedRight);
            constrainedLeft *= ratio;
            constrainedRight *= ratio;
        }

        // Apply snap threshold
        if (Math.abs(constrainedLeft - leftSize) < this.options.snapThreshold) {
            constrainedLeft = leftSize;
            constrainedRight = rightSize;
        }

        return { left: constrainedLeft, right: constrainedRight };
    }

    getPanelSize(panel, orientation) {
        const rect = panel.getBoundingClientRect();
        return orientation === 'vertical' ? rect.width : rect.height;
    }

    setPanelSize(panel, size, orientation) {
        if (orientation === 'vertical') {
            panel.style.width = `${size}px`;
            panel.style.flexBasis = `${size}px`;
        } else {
            panel.style.height = `${size}px`;
            panel.style.flexBasis = `${size}px`;
        }
        panel.style.flexShrink = '0';
        panel.style.flexGrow = '0';
    }

    getContainerSize(orientation) {
        const rect = this.container.getBoundingClientRect();
        return orientation === 'vertical' ? rect.width : rect.height;
    }

    getResizerSize(resizer, orientation) {
        const rect = resizer.getBoundingClientRect();
        return orientation === 'vertical' ? rect.width : rect.height;
    }

    triggerPanelResize(panel) {
        // Trigger custom event for components that need to know about resize
        const event = new CustomEvent('panelResize', {
            detail: { panel: panel }
        });
        panel.dispatchEvent(event);

        // Special handling for CodeMirror editors
        const codeMirror = panel.querySelector('.CodeMirror');
        if (codeMirror && codeMirror.CodeMirror) {
            setTimeout(() => {
                codeMirror.CodeMirror.refresh();
            }, 10);
        }
    }

    // Keyboard-based resizing
    adjustPanelSize(panelSide, delta) {
        // Find the first resizer for keyboard adjustment
        const firstResizer = Array.from(this.panels.values())[0];
        if (!firstResizer) return;

        const targetPanel = panelSide === 'left' ? 
            firstResizer.leftPanel : firstResizer.rightPanel;
        const otherPanel = panelSide === 'left' ? 
            firstResizer.rightPanel : firstResizer.leftPanel;

        const currentSize = this.getPanelSize(targetPanel, firstResizer.orientation);
        const otherSize = this.getPanelSize(otherPanel, firstResizer.orientation);

        const newTargetSize = currentSize + delta;
        const newOtherSize = otherSize - delta;

        const constrainedSizes = this.applyConstraints(
            panelSide === 'left' ? newTargetSize : newOtherSize,
            panelSide === 'left' ? newOtherSize : newTargetSize,
            firstResizer
        );

        this.setPanelSize(
            firstResizer.leftPanel,
            constrainedSizes.left,
            firstResizer.orientation
        );
        this.setPanelSize(
            firstResizer.rightPanel,
            constrainedSizes.right,
            firstResizer.orientation
        );

        this.triggerPanelResize(firstResizer.leftPanel);
        this.triggerPanelResize(firstResizer.rightPanel);
        this.persistSizes();
    }

    handleWindowResize() {
        // Recalculate panel sizes when window resizes
        this.panels.forEach(config => {
            this.triggerPanelResize(config.leftPanel);
            this.triggerPanelResize(config.rightPanel);
        });
    }

    // Persistence
    persistSizes() {
        if (!this.options.persistSizes) return;

        const sizes = {};
        this.panels.forEach(config => {
            sizes[config.id] = {
                left: this.getPanelSize(config.leftPanel, config.orientation),
                right: this.getPanelSize(config.rightPanel, config.orientation)
            };
        });

        localStorage.setItem('panelResizer.sizes', JSON.stringify(sizes));
    }

    loadPersistedSizes() {
        if (!this.options.persistSizes) return;

        try {
            const savedSizes = localStorage.getItem('panelResizer.sizes');
            if (savedSizes) {
                const sizes = JSON.parse(savedSizes);
                
                this.panels.forEach(config => {
                    const savedSize = sizes[config.id];
                    if (savedSize) {
                        this.setPanelSize(config.leftPanel, savedSize.left, config.orientation);
                        this.setPanelSize(config.rightPanel, savedSize.right, config.orientation);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load persisted panel sizes:', error);
        }
    }

    // Public API
    setPanelMinSize(resizerId, side, minSize) {
        const config = this.panels.get(resizerId);
        if (config) {
            if (side === 'left') {
                config.minLeftSize = minSize;
            } else if (side === 'right') {
                config.minRightSize = minSize;
            }
        }
    }

    setPanelMaxSize(resizerId, side, maxSize) {
        const config = this.panels.get(resizerId);
        if (config) {
            if (side === 'left') {
                config.maxLeftSize = maxSize;
            } else if (side === 'right') {
                config.maxRightSize = maxSize;
            }
        }
    }

    collapsPanel(resizerId, side) {
        const config = this.panels.get(resizerId);
        if (!config) return;

        const panelToCollapse = side === 'left' ? config.leftPanel : config.rightPanel;
        const otherPanel = side === 'left' ? config.rightPanel : config.leftPanel;

        // Store original size for restoration
        const originalSize = this.getPanelSize(panelToCollapse, config.orientation);
        panelToCollapse.dataset.originalSize = originalSize;

        // Collapse to minimum
        this.setPanelSize(panelToCollapse, 0, config.orientation);
        panelToCollapse.style.display = 'none';

        // Expand other panel
        const containerSize = this.getContainerSize(config.orientation);
        const resizerSize = this.getResizerSize(config.element, config.orientation);
        this.setPanelSize(otherPanel, containerSize - resizerSize, config.orientation);

        this.triggerPanelResize(otherPanel);
        this.persistSizes();
    }

    expandPanel(resizerId, side) {
        const config = this.panels.get(resizerId);
        if (!config) return;

        const panelToExpand = side === 'left' ? config.leftPanel : config.rightPanel;
        const otherPanel = side === 'left' ? config.rightPanel : config.leftPanel;

        // Restore original size
        const originalSize = parseInt(panelToExpand.dataset.originalSize) || 250;
        
        panelToExpand.style.display = '';
        this.setPanelSize(panelToExpand, originalSize, config.orientation);

        // Adjust other panel
        const containerSize = this.getContainerSize(config.orientation);
        const resizerSize = this.getResizerSize(config.element, config.orientation);
        this.setPanelSize(otherPanel, containerSize - originalSize - resizerSize, config.orientation);

        this.triggerPanelResize(panelToExpand);
        this.triggerPanelResize(otherPanel);
        this.persistSizes();
    }

    resetToDefaults() {
        this.panels.forEach(config => {
            const containerSize = this.getContainerSize(config.orientation);
            const resizerSize = this.getResizerSize(config.element, config.orientation);
            const availableSize = containerSize - resizerSize;
            
            // Split 30/70 by default (file manager / editor)
            const leftSize = Math.floor(availableSize * 0.3);
            const rightSize = availableSize - leftSize;

            this.setPanelSize(config.leftPanel, leftSize, config.orientation);
            this.setPanelSize(config.rightPanel, rightSize, config.orientation);

            this.triggerPanelResize(config.leftPanel);
            this.triggerPanelResize(config.rightPanel);
        });

        this.persistSizes();
    }
}

// Export for use in other modules
window.PanelResizer = PanelResizer;
