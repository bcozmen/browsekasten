/**
 * CODEMIRROR SEARCH COMPONENT
 * 
 * This component provides enhanced search and replace functionality for CodeMirror editors.
 * It includes highlighting, navigation, and batch replacement features.
 * 
 * Features:
 * - Real-time search highlighting
 * - Forward/backward navigation
 * - Single and batch replacement
 * - Wrap-around searching
 * - Keyboard shortcuts
 * 
 * Usage:
 * const search = new CodeMirrorSearch(codeMirrorInstance);
 * search.showSearchBar();
 */
class CodeMirrorSearch {
    /**
     * @param {CodeMirror} editor - CodeMirror editor instance
     * @param {Object} options - Configuration options
     */
    constructor(editor, options = {}) {
        this.editor = editor;
        this.options = {
            caseSensitive: false,
            useRegex: false,
            ...options
        };
        
        this.searchState = {
            query: '',
            lastQuery: '',
            overlay: null,
            results: []
        };

        this.setupKeyboardShortcuts();
    }

    /**
     * Show the search toolbar
     */
    showSearchBar() {
        const toolbar = document.getElementById('search-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
            const findInput = document.getElementById('find-input');
            if (findInput) {
                findInput.focus();
            }
        }
    }

    /**
     * Hide the search toolbar
     */
    hideSearchBar() {
        const toolbar = document.getElementById('search-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
            this.clearSearch();
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.editor.addKeyMap({
            "Ctrl-F": () => this.showSearchBar(),
            "Ctrl-H": () => this.showSearchBar(),
            "Esc": () => this.hideSearchBar(),
            "F3": () => this.findNext(),
            "Shift-F3": () => this.findPrevious(),
            "Ctrl-G": () => this.findNext(),
            "Shift-Ctrl-G": () => this.findPrevious()
        });
    }

    /**
     * Perform search and highlight matches
     * @param {string} query - Search query
     */
    doSearch(query) {
        // Remove existing overlay
        if (this.searchState.overlay) {
            this.editor.removeOverlay(this.searchState.overlay);
        }
        
        if (!query) return;

        this.searchState.query = query;

        // Create search pattern
        let pattern;
        if (this.options.useRegex) {
            try {
                pattern = new RegExp(query, this.options.caseSensitive ? 'g' : 'gi');
            } catch (e) {
                console.warn('Invalid regex pattern:', query);
                return;
            }
        } else {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            pattern = new RegExp(escapedQuery, this.options.caseSensitive ? 'g' : 'gi');
        }

        // Create overlay for highlighting
        this.searchState.overlay = {
            token: (stream) => {
                pattern.lastIndex = 0; // Reset regex state
                const match = pattern.exec(stream.string.substr(stream.pos));
                if (match && match.index === 0) {
                    stream.pos += match[0].length;
                    return 'searching';
                }
                stream.next();
                stream.skipToEnd();
            }
        };

        this.editor.addOverlay(this.searchState.overlay);
    }

    /**
     * Find next occurrence
     */
    findNext() {
        const query = this.searchState.query || document.getElementById('find-input')?.value;
        if (!query) return;

        const cursor = this.editor.getSearchCursor(
            query, 
            this.editor.getCursor(),
            !this.options.caseSensitive
        );
        
        if (cursor.findNext()) {
            this.selectAndScroll(cursor);
        } else {
            // Wrap around to beginning
            const cursor2 = this.editor.getSearchCursor(
                query, 
                null,
                !this.options.caseSensitive
            );
            if (cursor2.findNext()) {
                this.selectAndScroll(cursor2);
            }
        }
    }

    /**
     * Find previous occurrence
     */
    findPrevious() {
        const query = this.searchState.query || document.getElementById('find-input')?.value;
        if (!query) return;

        const cursor = this.editor.getSearchCursor(
            query, 
            this.editor.getCursor(),
            !this.options.caseSensitive
        );
        
        if (cursor.findPrevious()) {
            this.selectAndScroll(cursor);
        } else {
            // Wrap around to end
            const cursor2 = this.editor.getSearchCursor(
                query, 
                { line: this.editor.lastLine(), ch: null },
                !this.options.caseSensitive
            );
            if (cursor2.findPrevious()) {
                this.selectAndScroll(cursor2);
            }
        }
    }

    /**
     * Replace next occurrence
     * @param {string} replacement - Replacement text
     */
    replaceNext(replacement = '') {
        const query = this.searchState.query || document.getElementById('find-input')?.value;
        if (!query) return;

        const cursor = this.editor.getSearchCursor(
            query,
            this.editor.getCursor(),
            !this.options.caseSensitive
        );
        
        if (cursor.findNext()) {
            cursor.replace(replacement);
            this.selectAndScroll(cursor);
        }
    }

    /**
     * Replace all occurrences
     * @param {string} replacement - Replacement text
     * @returns {number} - Number of replacements made
     */
    replaceAll(replacement = '') {
        const query = this.searchState.query || document.getElementById('find-input')?.value;
        if (!query) return 0;

        const cursor = this.editor.getSearchCursor(
            query,
            null,
            !this.options.caseSensitive
        );
        
        let count = 0;
        while (cursor.findNext()) {
            cursor.replace(replacement);
            count++;
        }
        
        return count;
    }

    /**
     * Clear search highlighting
     */
    clearSearch() {
        if (this.searchState.overlay) {
            this.editor.removeOverlay(this.searchState.overlay);
            this.searchState.overlay = null;
        }
        this.searchState.query = '';
    }

    /**
     * Select and scroll to cursor position
     * @param {SearchCursor} cursor - CodeMirror search cursor
     */
    selectAndScroll(cursor) {
        this.editor.setSelection(cursor.from(), cursor.to());
        this.editor.scrollIntoView(cursor.from());
    }

    /**
     * Setup search toolbar event handlers
     * @param {string} toolbarSelector - CSS selector for search toolbar
     */
    setupSearchToolbar(toolbarSelector = '#search-toolbar') {
        const toolbar = document.querySelector(toolbarSelector);
        if (!toolbar) return;

        // Find input
        const findInput = toolbar.querySelector('#find-input');
        if (findInput) {
            findInput.addEventListener('input', (e) => {
                this.doSearch(e.target.value);
            });

            findInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.findPrevious();
                    } else {
                        this.findNext();
                    }
                }
            });
        }

        // Replace input
        const replaceInput = toolbar.querySelector('#replace-input');
        if (replaceInput) {
            replaceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.replaceNext(e.target.value);
                }
            });
        }

        // Buttons
        const buttons = {
            '#find-next': () => this.findNext(),
            '#find-prev': () => this.findPrevious(),
            '#replace-btn': () => {
                const replacement = replaceInput?.value || '';
                this.replaceNext(replacement);
            },
            '#replace-all-btn': () => {
                const replacement = replaceInput?.value || '';
                const count = this.replaceAll(replacement);
                alert(`Replaced ${count} occurrences`);
            },
            '#close-search': () => this.hideSearchBar()
        };

        Object.entries(buttons).forEach(([selector, handler]) => {
            const button = toolbar.querySelector(selector);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }

    /**
     * Toggle case sensitivity
     */
    toggleCaseSensitive() {
        this.options.caseSensitive = !this.options.caseSensitive;
        if (this.searchState.query) {
            this.doSearch(this.searchState.query);
        }
    }

    /**
     * Toggle regex mode
     */
    toggleRegex() {
        this.options.useRegex = !this.options.useRegex;
        if (this.searchState.query) {
            this.doSearch(this.searchState.query);
        }
    }

    /**
     * Destroy the search component
     */
    destroy() {
        this.clearSearch();
        this.editor.removeKeyMap(this.keyMap);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodeMirrorSearch;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.CodeMirrorSearch = CodeMirrorSearch;
}
