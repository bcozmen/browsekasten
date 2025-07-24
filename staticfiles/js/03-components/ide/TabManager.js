/**
 * TabManager.js
 * 
 * Manages multiple editor tabs with support for opening, closing, switching,
 * and organizing tabs. Designed to work with multiple editor containers.
 */

class TabManager {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.options = {
            maxTabs: 20,
            showCloseButton: true,
            enableReordering: true,
            persistTabs: true,
            ...options
        };

        // State management
        this.tabs = new Map(); // tab id -> tab data
        this.activeTabId = null;
        this.tabOrder = []; // Array of tab IDs in display order
        
        // DOM elements
        this.tabBar = null;
        this.editorArea = null;
        
        // Event handlers
        this.onTabCreate = null;
        this.onTabClose = null;
        this.onTabSwitch = null;
        this.onTabReorder = null;
        
        this.init();
    }

    init() {
        this.createTabStructure();
        this.setupEventListeners();
        this.loadPersistedTabs();
    }

    createTabStructure() {
        // Create tab bar if it doesn't exist
        this.tabBar = this.container.querySelector('.tab-bar');
        if (!this.tabBar) {
            this.tabBar = document.createElement('div');
            this.tabBar.className = 'tab-bar';
            this.container.insertBefore(this.tabBar, this.container.firstChild);
        }

        // Ensure editor area exists
        this.editorArea = this.container.querySelector('.editor-area') || 
                         this.container.querySelector('.editor-container') ||
                         this.container;

        // Add tab bar HTML structure
        this.tabBar.innerHTML = `
            <div class="tab-list" role="tablist"></div>
            <div class="tab-actions">
                <button class="tab-action-btn" id="new-tab-btn" title="New Tab">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
                <button class="tab-action-btn" id="close-all-btn" title="Close All Tabs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;

        this.tabList = this.tabBar.querySelector('.tab-list');
    }

    setupEventListeners() {
        // Tab clicking
        this.tabList.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            const closeBtn = e.target.closest('.tab-close');
            
            if (closeBtn) {
                e.stopPropagation();
                this.closeTab(tab.dataset.tabId);
            } else if (tab) {
                this.switchToTab(tab.dataset.tabId);
            }
        });

        // Middle click to close tab
        this.tabList.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                const tab = e.target.closest('.tab');
                if (tab) {
                    e.preventDefault();
                    this.closeTab(tab.dataset.tabId);
                }
            }
        });

        // Tab actions
        const newTabBtn = this.tabBar.querySelector('#new-tab-btn');
        const closeAllBtn = this.tabBar.querySelector('#close-all-btn');
        
        newTabBtn?.addEventListener('click', () => this.createNewTab());
        closeAllBtn?.addEventListener('click', () => this.closeAllTabs());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 't':
                        e.preventDefault();
                        this.createNewTab();
                        break;
                    case 'w':
                        if (this.activeTabId) {
                            e.preventDefault();
                            this.closeTab(this.activeTabId);
                        }
                        break;
                    case 'Tab':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.switchToPreviousTab();
                        } else {
                            this.switchToNextTab();
                        }
                        break;
                }
                
                // Number keys for tab switching (Ctrl+1, Ctrl+2, etc.)
                const num = parseInt(e.key);
                if (num >= 1 && num <= 9) {
                    e.preventDefault();
                    const tabId = this.tabOrder[num - 1];
                    if (tabId) {
                        this.switchToTab(tabId);
                    }
                }
            }
        });

        // Drag and drop for tab reordering
        if (this.options.enableReordering) {
            this.setupTabReordering();
        }
    }

    setupTabReordering() {
        let draggedTab = null;
        let dragStartIndex = -1;

        this.tabList.addEventListener('dragstart', (e) => {
            const tab = e.target.closest('.tab');
            if (tab) {
                draggedTab = tab;
                dragStartIndex = this.tabOrder.indexOf(tab.dataset.tabId);
                e.dataTransfer.effectAllowed = 'move';
                tab.classList.add('dragging');
            }
        });

        this.tabList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(e.clientX);
            if (afterElement == null) {
                this.tabList.appendChild(draggedTab);
            } else {
                this.tabList.insertBefore(draggedTab, afterElement);
            }
        });

        this.tabList.addEventListener('dragend', (e) => {
            if (draggedTab) {
                draggedTab.classList.remove('dragging');
                
                // Update tab order
                const newIndex = Array.from(this.tabList.children).indexOf(draggedTab);
                if (newIndex !== dragStartIndex) {
                    const tabId = draggedTab.dataset.tabId;
                    this.reorderTab(tabId, newIndex);
                }
                
                draggedTab = null;
                dragStartIndex = -1;
            }
        });
    }

    getDragAfterElement(x) {
        const draggableElements = [...this.tabList.querySelectorAll('.tab:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Tab management methods
    createTab(fileId, fileName, content = '', options = {}) {
        const tabId = options.tabId || `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if tab already exists
        if (this.tabs.has(tabId)) {
            this.switchToTab(tabId);
            return tabId;
        }

        // Check max tabs limit
        if (this.tabs.size >= this.options.maxTabs) {
            console.warn(`Maximum number of tabs (${this.options.maxTabs}) reached`);
            return null;
        }

        // Create tab data
        const tabData = {
            id: tabId,
            fileId: fileId,
            fileName: fileName,
            content: content,
            isModified: false,
            isPinned: options.pinned || false,
            element: null,
            editorInstance: null,
            ...options
        };

        // Create tab DOM element
        tabData.element = this.createTabElement(tabData);
        
        // Add to collections
        this.tabs.set(tabId, tabData);
        this.tabOrder.push(tabId);
        
        // Add to DOM
        this.tabList.appendChild(tabData.element);
        
        // Switch to new tab
        this.switchToTab(tabId);
        
        // Trigger callback
        if (this.onTabCreate) {
            this.onTabCreate(tabData);
        }

        this.persistTabs();
        return tabId;
    }

    createTabElement(tabData) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabData.id;
        tab.draggable = this.options.enableReordering;
        tab.role = 'tab';
        tab.setAttribute('aria-selected', 'false');

        tab.innerHTML = `
            <div class="tab-content">
                <div class="tab-icon">
                    ${this.getFileIcon(tabData.fileName)}
                </div>
                <span class="tab-title" title="${tabData.fileName}">${tabData.fileName}</span>
                <div class="tab-modified-indicator" style="display: none;">●</div>
                ${tabData.isPinned ? '<div class="tab-pin-indicator">📌</div>' : ''}
                ${this.options.showCloseButton ? `
                    <button class="tab-close" title="Close tab" aria-label="Close ${tabData.fileName}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;

        return tab;
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        const iconMap = {
            'md': '📝',
            'txt': '📄',
            'js': '📜',
            'json': '⚙️',
            'css': '🎨',
            'html': '🌐',
            'py': '🐍',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'pdf': '📕'
        };

        return iconMap[extension] || '📄';
    }

    switchToTab(tabId) {
        if (!this.tabs.has(tabId)) return false;

        // Deactivate current tab
        if (this.activeTabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            currentTab.element.classList.remove('active');
            currentTab.element.setAttribute('aria-selected', 'false');
            
            // Hide current editor content
            if (currentTab.editorInstance) {
                this.hideEditorContent(currentTab.editorInstance);
            }
        }

        // Activate new tab
        const newTab = this.tabs.get(tabId);
        newTab.element.classList.add('active');
        newTab.element.setAttribute('aria-selected', 'true');
        
        // Show/create editor content
        this.showEditorContent(newTab);
        
        this.activeTabId = tabId;

        // Trigger callback
        if (this.onTabSwitch) {
            this.onTabSwitch(newTab, this.tabs.get(this.activeTabId));
        }

        this.persistTabs();
        return true;
    }

    closeTab(tabId) {
        if (!this.tabs.has(tabId)) return false;

        const tab = this.tabs.get(tabId);
        
        // Check for unsaved changes
        if (tab.isModified) {
            const save = confirm(`"${tab.fileName}" has unsaved changes. Close anyway?`);
            if (!save) return false;
        }

        // Remove from DOM
        tab.element.remove();
        
        // Clean up editor instance
        if (tab.editorInstance) {
            this.cleanupEditorInstance(tab.editorInstance);
        }

        // Remove from collections
        this.tabs.delete(tabId);
        this.tabOrder = this.tabOrder.filter(id => id !== tabId);
        
        // Switch to adjacent tab if this was active
        if (this.activeTabId === tabId) {
            this.activeTabId = null;
            
            if (this.tabOrder.length > 0) {
                // Switch to next tab or last tab
                const nextTab = this.tabOrder[this.tabOrder.length - 1];
                this.switchToTab(nextTab);
            }
        }

        // Trigger callback
        if (this.onTabClose) {
            this.onTabClose(tab);
        }

        this.persistTabs();
        return true;
    }

    closeAllTabs() {
        const tabIds = [...this.tabs.keys()];
        tabIds.forEach(tabId => this.closeTab(tabId));
    }

    createNewTab() {
        const fileName = `Untitled-${this.tabs.size + 1}.md`;
        return this.createTab(null, fileName, '');
    }

    switchToNextTab() {
        if (this.tabOrder.length <= 1) return;
        
        const currentIndex = this.tabOrder.indexOf(this.activeTabId);
        const nextIndex = (currentIndex + 1) % this.tabOrder.length;
        this.switchToTab(this.tabOrder[nextIndex]);
    }

    switchToPreviousTab() {
        if (this.tabOrder.length <= 1) return;
        
        const currentIndex = this.tabOrder.indexOf(this.activeTabId);
        const prevIndex = currentIndex === 0 ? this.tabOrder.length - 1 : currentIndex - 1;
        this.switchToTab(this.tabOrder[prevIndex]);
    }

    reorderTab(tabId, newIndex) {
        const currentIndex = this.tabOrder.indexOf(tabId);
        if (currentIndex === -1 || newIndex === currentIndex) return;

        // Remove from current position
        this.tabOrder.splice(currentIndex, 1);
        
        // Insert at new position
        this.tabOrder.splice(newIndex, 0, tabId);

        // Trigger callback
        if (this.onTabReorder) {
            this.onTabReorder(tabId, currentIndex, newIndex);
        }

        this.persistTabs();
    }

    // Editor integration methods (to be implemented based on your editor)
    showEditorContent(tab) {
        // This method should be overridden or customized based on your editor implementation
        console.log('Showing editor content for tab:', tab.fileName);
        
        // Example implementation:
        // if (!tab.editorInstance) {
        //     tab.editorInstance = this.createEditorInstance(tab);
        // }
        // this.editorArea.appendChild(tab.editorInstance.element);
    }

    hideEditorContent(editorInstance) {
        // Hide the current editor content
        console.log('Hiding editor content');
        
        // Example implementation:
        // if (editorInstance && editorInstance.element) {
        //     editorInstance.element.style.display = 'none';
        // }
    }

    cleanupEditorInstance(editorInstance) {
        // Clean up editor resources
        console.log('Cleaning up editor instance');
    }

    // Tab state management
    markTabAsModified(tabId, isModified = true) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.isModified = isModified;
        const indicator = tab.element.querySelector('.tab-modified-indicator');
        indicator.style.display = isModified ? 'inline' : 'none';
        
        // Update tab title
        const title = tab.element.querySelector('.tab-title');
        if (isModified && !title.textContent.endsWith('*')) {
            title.textContent += '*';
        } else if (!isModified && title.textContent.endsWith('*')) {
            title.textContent = title.textContent.slice(0, -1);
        }
    }

    // Persistence
    persistTabs() {
        if (!this.options.persistTabs) return;

        const tabData = {
            tabs: Array.from(this.tabs.values()).map(tab => ({
                id: tab.id,
                fileId: tab.fileId,
                fileName: tab.fileName,
                isPinned: tab.isPinned
            })),
            activeTabId: this.activeTabId,
            tabOrder: [...this.tabOrder]
        };

        localStorage.setItem('tabManager.state', JSON.stringify(tabData));
    }

    loadPersistedTabs() {
        if (!this.options.persistTabs) return;

        try {
            const savedData = localStorage.getItem('tabManager.state');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Restore tabs (implementation depends on your file loading system)
                // This is a placeholder - you'll need to implement based on your API
                console.log('Loading persisted tabs:', data);
            }
        } catch (error) {
            console.warn('Failed to load persisted tabs:', error);
        }
    }

    // Public API
    getActiveTab() {
        return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
    }

    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    getTabById(tabId) {
        return this.tabs.get(tabId);
    }

    hasUnsavedChanges() {
        return Array.from(this.tabs.values()).some(tab => tab.isModified);
    }

    // Event listener setters
    setOnTabCreate(callback) { this.onTabCreate = callback; }
    setOnTabClose(callback) { this.onTabClose = callback; }
    setOnTabSwitch(callback) { this.onTabSwitch = callback; }
    setOnTabReorder(callback) { this.onTabReorder = callback; }
}

// Export for use in other modules
window.TabManager = TabManager;
