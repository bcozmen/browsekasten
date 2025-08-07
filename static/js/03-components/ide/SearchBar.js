class SearchBar {
    constructor(editor, options = {}) {
        this.editor = editor;
        this.options = {
            caseSensitive: false,
            useRegex: false,
            highlightClass: 'searching',
            ...options
        };
        
        this.searchState = {
            query: '',
            lastQuery: '',
            overlay: null,
            currentMatch: null,
            matchCount: 0
        };
    }

    // Find and highlight all occurrences of a query
    search(query, options = {}) {
        const searchOptions = { ...this.options, ...options };
        
        this.clearHighlighting();
        
        if (!query || typeof query !== 'string') {
            this.searchState.query = '';
            return;
        }
        
        this.searchState.lastQuery = this.searchState.query;
        this.searchState.query = query;
        
        try {
            this.searchState.overlay = {
                token: (stream) => {
                    // Create regex pattern based on search options
                    const flags = searchOptions.caseSensitive ? 'g' : 'gi';
                    const pattern = searchOptions.useRegex ? 
                        new RegExp(query, flags) : 
                        new RegExp(this.escapeRegex(query), flags);
                    
                    if (stream.match(pattern)) {
                        return this.options.highlightClass;
                    }
                    
                    stream.next();
                    stream.skipToEnd();
                    return null;
                }
            };
            
            this.editor.addOverlay(this.searchState.overlay);
            
        } catch (error) {
            console.error('Error creating search overlay:', error);
            this.searchState.query = '';
        }
    }

    // Navigate to the next search match
    findNext() {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return false;
        }
        
        try {
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query, 
                this.editor.getCursor(),
                !this.options.caseSensitive
            );
            
            if (searchCursor.findNext()) {
                this.selectMatch(searchCursor);
                return true;
            } else {
                // Wrap around to beginning
                const wrapCursor = this.editor.getSearchCursor(
                    this.searchState.query,
                    null,
                    !this.options.caseSensitive
                );
                
                if (wrapCursor.findNext()) {
                    this.selectMatch(wrapCursor);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('Error finding next match:', error);
            return false;
        }
    }

    // Navigate to the previous search match
    findPrevious() {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return false;
        }
        
        try {
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                this.editor.getCursor(),
                !this.options.caseSensitive
            );
            
            if (searchCursor.findPrevious()) {
                this.selectMatch(searchCursor);
                return true;
            } else {
                // Wrap around to end
                const wrapCursor = this.editor.getSearchCursor(
                    this.searchState.query,
                    { line: this.editor.lastLine(), ch: null },
                    !this.options.caseSensitive
                );
                
                if (wrapCursor.findPrevious()) {
                    this.selectMatch(wrapCursor);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('Error finding previous match:', error);
            return false;
        }
    }

    // Replace the next occurrence of the search query
    replaceNext(replacement) {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return false;
        }
        
        if (typeof replacement !== 'string') {
            console.warn('Replacement text must be a string');
            return false;
        }
        
        try {
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                this.editor.getCursor(),
                !this.options.caseSensitive
            );
            
            if (searchCursor.findNext()) {
                searchCursor.replace(replacement);
                this.editor.setSelection(searchCursor.from(), searchCursor.to());
                this.editor.scrollIntoView(searchCursor.from());
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error replacing next match:', error);
            return false;
        }
    }

    // Replace all occurrences of the search query
    replaceAll(replacement) {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return 0;
        }
        
        if (typeof replacement !== 'string') {
            console.warn('Replacement text must be a string');
            return 0;
        }
        
        try {
            let replacementCount = 0;
            
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                null,
                !this.options.caseSensitive
            );
            
            while (searchCursor.findNext()) {
                searchCursor.replace(replacement);
                replacementCount++;
            }
            
            if (replacementCount > 0) {
                console.log(`Replaced ${replacementCount} occurrences`);
            }
            
            return replacementCount;
            
        } catch (error) {
            console.error('Error replacing all matches:', error);
            return 0;
        }
    }

    // Remove search highlighting from the editor
    clearHighlighting() {
        if (this.searchState.overlay) {
            this.editor.removeOverlay(this.searchState.overlay);
            this.searchState.overlay = null;
        }
    }

    // Reset all search state
    clearSearch() {
        this.clearHighlighting();
        this.searchState.query = '';
        this.searchState.lastQuery = '';
        this.searchState.currentMatch = null;
        this.searchState.matchCount = 0;
    }

    // Count total number of matches
    getMatchCount() {
        if (!this.searchState.query) return 0;
        
        try {
            let count = 0;
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                null,
                !this.options.caseSensitive
            );
            
            while (searchCursor.findNext()) {
                count++;
            }
            
            this.searchState.matchCount = count;
            return count;
            
        } catch (error) {
            console.error('Error counting matches:', error);
            return 0;
        }
    }

    // Select and scroll to a search match
    selectMatch(searchCursor) {
        this.editor.setSelection(searchCursor.from(), searchCursor.to());
        this.editor.scrollIntoView(searchCursor.from());
        
        this.searchState.currentMatch = {
            from: searchCursor.from(),
            to: searchCursor.to()
        };
    }

    // Escape special regex characters in search query
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Clean up the searcher instance
    destroy() {
        this.clearSearch();
        this.editor = null;
        this.searchState = null;
    }
}

// ES6 Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchBar;
}

// Browser global exports
if (typeof window !== 'undefined') {
    window.SearchBar = SearchBar;
}
