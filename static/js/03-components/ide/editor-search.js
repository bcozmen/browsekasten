/**
 * SEARCH AND REPLACE FUNCTIONALITY
 * 
 * This module provides comprehensive search and replace capabilities for CodeMirror editors.
 * It includes text highlighting, navigation, and replacement operations with a clean API.
 * 
 * FEATURES:
 * - Real-time search highlighting using CodeMirror overlays
 * - Navigate between search results (next/previous)
 * - Replace single occurrence or all occurrences
 * - Wrap-around navigation (continues from beginning/end)
 * - Search state management
 * - Case-insensitive searching
 * - Regular expression support (optional)
 * 
 * USAGE:
 * const searcher = new EditorSearcher(codeMirrorInstance);
 * searcher.search('text to find');
 * searcher.findNext();
 * searcher.replace('replacement text');
 * 
 * DEPENDENCIES:
 * - CodeMirror editor instance
 * - CodeMirror search addon (searchcursor.js)
 */

/**
 * EDITOR SEARCHER CLASS
 * 
 * Encapsulates all search and replace functionality for CodeMirror editors.
 * Manages search state, highlighting, and provides intuitive navigation.
 */
class EditorSearcher {
    /**
     * CONSTRUCTOR: Initialize the search system
     * 
     * @param {CodeMirror} editor - The CodeMirror editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.caseSensitive - Whether search is case sensitive (default: false)
     * @param {boolean} options.useRegex - Whether to treat search as regex (default: false)
     * @param {string} options.highlightClass - CSS class for highlighting matches (default: 'searching')
     */
    constructor(editor, options = {}) {
        this.editor = editor;
        this.options = {
            caseSensitive: false,
            useRegex: false,
            highlightClass: 'searching',
            ...options
        };
        
        /**
         * SEARCH STATE MANAGEMENT
         * 
         * Tracks the current search operation and maintains state between operations.
         */
        this.searchState = {
            query: '',              // Current search query
            lastQuery: '',          // Previous search query for comparison
            overlay: null,          // CodeMirror overlay for highlighting
            currentMatch: null,     // Currently selected match
            matchCount: 0          // Total number of matches found
        };
    }

    /**
     * SEARCH METHOD: Find and highlight all occurrences of a query
     * 
     * This is the primary search method that highlights all matches in the document
     * using CodeMirror's overlay system for visual feedback.
     * 
     * @param {string} query - The text to search for
     * @param {Object} options - Search-specific options
     * @param {boolean} options.caseSensitive - Override default case sensitivity
     * @param {boolean} options.useRegex - Override default regex setting
     * 
     * SEARCH PROCESS:
     * 1. Clean up any existing search overlay
     * 2. Validate the search query
     * 3. Create a new overlay with match highlighting
     * 4. Apply the overlay to the editor
     * 5. Update search state
     */
    search(query, options = {}) {
        // Merge options with instance defaults
        const searchOptions = { ...this.options, ...options };
        
        // Remove any existing search overlay first
        this.clearHighlighting();
        
        // Validate query
        if (!query || typeof query !== 'string') {
            this.searchState.query = '';
            return;
        }
        
        // Update search state
        this.searchState.lastQuery = this.searchState.query;
        this.searchState.query = query;
        
        /**
         * CREATE SEARCH OVERLAY
         * 
         * CodeMirror overlays allow us to add visual styling to specific text patterns
         * without modifying the actual document content. This is perfect for highlighting
         * search results.
         */
        try {
            this.searchState.overlay = {
                /**
                 * TOKEN FUNCTION: Called for each character position in the editor
                 * 
                 * @param {CodeMirror.StringStream} stream - Character stream for current line
                 * @returns {string|null} - CSS class to apply or null for no styling
                 * 
                 * This function is called by CodeMirror for every character position.
                 * It determines whether the current position matches our search query.
                 */
                token: (stream) => {
                    // Create regex pattern based on search options
                    const flags = searchOptions.caseSensitive ? 'g' : 'gi';
                    const pattern = searchOptions.useRegex ? 
                        new RegExp(query, flags) : 
                        new RegExp(this.escapeRegex(query), flags);
                    
                    // Check if current position matches the search pattern
                    if (stream.match(pattern)) {
                        return this.options.highlightClass;  // Apply highlighting CSS class
                    }
                    
                    // Move to next character and skip to end of line for efficiency
                    stream.next();
                    stream.skipToEnd();
                    return null;
                }
            };
            
            // Apply the overlay to the editor
            this.editor.addOverlay(this.searchState.overlay);
            
        } catch (error) {
            console.error('Error creating search overlay:', error);
            this.searchState.query = '';
        }
    }

    /**
     * FIND NEXT: Navigate to the next search match
     * 
     * Uses CodeMirror's getSearchCursor to find and navigate to the next occurrence
     * of the current search query. Includes wrap-around behavior.
     * 
     * @returns {boolean} - True if a match was found, false otherwise
     * 
     * NAVIGATION PROCESS:
     * 1. Create a search cursor from current position
     * 2. Try to find next match
     * 3. If found: select and scroll to match
     * 4. If not found: wrap around to beginning and try again
     * 5. Update current match state
     */
    findNext() {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return false;
        }
        
        try {
            // Create search cursor starting from current cursor position
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query, 
                this.editor.getCursor(),
                !this.options.caseSensitive  // CodeMirror uses inverted case sensitivity flag
            );
            
            if (searchCursor.findNext()) {
                // Found a match: select it and scroll to it
                this.selectMatch(searchCursor);
                return true;
            } else {
                // No more matches: wrap around to beginning
                const wrapCursor = this.editor.getSearchCursor(
                    this.searchState.query,
                    null,  // Start from beginning
                    !this.options.caseSensitive
                );
                
                if (wrapCursor.findNext()) {
                    this.selectMatch(wrapCursor);
                    return true;
                }
            }
            
            return false;  // No matches found
            
        } catch (error) {
            console.error('Error finding next match:', error);
            return false;
        }
    }

    /**
     * FIND PREVIOUS: Navigate to the previous search match
     * 
     * Similar to findNext() but searches backward from the current position.
     * Includes wrap-around to the end of the document.
     * 
     * @returns {boolean} - True if a match was found, false otherwise
     */
    findPrevious() {
        if (!this.searchState.query) {
            console.warn('No search query set');
            return false;
        }
        
        try {
            // Create search cursor starting from current cursor position
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                this.editor.getCursor(),
                !this.options.caseSensitive
            );
            
            if (searchCursor.findPrevious()) {
                // Found a match: select it and scroll to it
                this.selectMatch(searchCursor);
                return true;
            } else {
                // No more matches: wrap around to end
                const wrapCursor = this.editor.getSearchCursor(
                    this.searchState.query,
                    { line: this.editor.lastLine(), ch: null },  // Start from end
                    !this.options.caseSensitive
                );
                
                if (wrapCursor.findPrevious()) {
                    this.selectMatch(wrapCursor);
                    return true;
                }
            }
            
            return false;  // No matches found
            
        } catch (error) {
            console.error('Error finding previous match:', error);
            return false;
        }
    }

    /**
     * REPLACE NEXT: Replace the next occurrence of the search query
     * 
     * Finds the next match and replaces it with the provided replacement text.
     * Automatically moves to the next match after replacement.
     * 
     * @param {string} replacement - Text to replace the match with
     * @returns {boolean} - True if a replacement was made, false otherwise
     */
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
            // Create search cursor from current position
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                this.editor.getCursor(),
                !this.options.caseSensitive
            );
            
            if (searchCursor.findNext()) {
                // Replace the match
                searchCursor.replace(replacement);
                
                // Select the replaced text to show what was changed
                this.editor.setSelection(searchCursor.from(), searchCursor.to());
                
                // Scroll to the replacement
                this.editor.scrollIntoView(searchCursor.from());
                
                return true;
            }
            
            return false;  // No match found to replace
            
        } catch (error) {
            console.error('Error replacing next match:', error);
            return false;
        }
    }

    /**
     * REPLACE ALL: Replace all occurrences of the search query
     * 
     * Iterates through the entire document and replaces every match
     * with the provided replacement text. Provides user feedback.
     * 
     * @param {string} replacement - Text to replace all matches with
     * @returns {number} - Number of replacements made
     */
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
            
            // Create search cursor from beginning of document
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                null,  // Start from beginning
                !this.options.caseSensitive
            );
            
            // Replace all matches
            while (searchCursor.findNext()) {
                searchCursor.replace(replacement);
                replacementCount++;
            }
            
            // Provide user feedback
            if (replacementCount > 0) {
                console.log(`Replaced ${replacementCount} occurrences`);
                // You could also show a toast notification or update UI here
            }
            
            return replacementCount;
            
        } catch (error) {
            console.error('Error replacing all matches:', error);
            return 0;
        }
    }

    /**
     * CLEAR HIGHLIGHTING: Remove search highlighting from the editor
     * 
     * Removes the current search overlay to clear all highlighting.
     * This is called when starting a new search or closing search.
     */
    clearHighlighting() {
        if (this.searchState.overlay) {
            this.editor.removeOverlay(this.searchState.overlay);
            this.searchState.overlay = null;
        }
    }

    /**
     * CLEAR SEARCH: Reset all search state
     * 
     * Completely clears the search state and removes highlighting.
     * Used when closing the search interface.
     */
    clearSearch() {
        this.clearHighlighting();
        this.searchState.query = '';
        this.searchState.lastQuery = '';
        this.searchState.currentMatch = null;
        this.searchState.matchCount = 0;
    }

    /**
     * GET MATCH COUNT: Count total number of matches
     * 
     * Provides the total number of matches for the current search query.
     * Useful for showing "1 of 5 matches" type feedback.
     * 
     * @returns {number} - Total number of matches
     */
    getMatchCount() {
        if (!this.searchState.query) return 0;
        
        try {
            let count = 0;
            const searchCursor = this.editor.getSearchCursor(
                this.searchState.query,
                null,  // Start from beginning
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

    /**
     * UTILITY METHODS
     * 
     * Helper functions used internally by the search system.
     */

    /**
     * SELECT MATCH: Select and scroll to a search match
     * 
     * @param {CodeMirror.SearchCursor} searchCursor - The search cursor with found match
     */
    selectMatch(searchCursor) {
        // Select the match text
        this.editor.setSelection(searchCursor.from(), searchCursor.to());
        
        // Scroll the match into view
        this.editor.scrollIntoView(searchCursor.from());
        
        // Update current match state
        this.searchState.currentMatch = {
            from: searchCursor.from(),
            to: searchCursor.to()
        };
    }

    /**
     * ESCAPE REGEX: Escape special regex characters in search query
     * 
     * @param {string} string - String to escape
     * @returns {string} - Escaped string safe for regex
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * DESTROY: Clean up the searcher instance
     * 
     * Removes all overlays and clears state. Call this when the searcher
     * is no longer needed to prevent memory leaks.
     */
    destroy() {
        this.clearSearch();
        this.editor = null;
        this.searchState = null;
    }
}

/**
 * STANDALONE SEARCH FUNCTIONS
 * 
 * For backward compatibility and simple use cases, these functions provide
 * direct access to search functionality without creating a class instance.
 */

/**
 * Simple search function for basic highlighting
 * @param {CodeMirror} cm - CodeMirror editor instance
 * @param {string} query - Search query
 */
function doSearch(cm, query) {
    const searcher = new EditorSearcher(cm);
    searcher.search(query);
}

/**
 * Find next match function
 * @param {CodeMirror} cm - CodeMirror editor instance
 * @param {string} query - Search query
 */
function findNext(cm, query) {
    const searcher = new EditorSearcher(cm);
    searcher.search(query);
    searcher.findNext();
}

/**
 * Find previous match function
 * @param {CodeMirror} cm - CodeMirror editor instance
 * @param {string} query - Search query
 */
function findPrev(cm, query) {
    const searcher = new EditorSearcher(cm);
    searcher.search(query);
    searcher.findPrevious();
}

/**
 * Replace next match function
 * @param {CodeMirror} cm - CodeMirror editor instance
 * @param {string} query - Search query
 * @param {string} replacement - Replacement text
 */
function replaceNext(cm, query, replacement) {
    const searcher = new EditorSearcher(cm);
    searcher.search(query);
    searcher.replaceNext(replacement);
}

/**
 * Replace all matches function
 * @param {CodeMirror} cm - CodeMirror editor instance
 * @param {string} query - Search query
 * @param {string} replacement - Replacement text
 */
function replaceAll(cm, query, replacement) {
    const searcher = new EditorSearcher(cm);
    searcher.search(query);
    return searcher.replaceAll(replacement);
}

/**
 * MODULE EXPORTS
 * 
 * Export the searcher class and standalone functions for different use cases.
 */

// ES6 Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EditorSearcher,
        doSearch,
        findNext,
        findPrev,
        replaceNext,
        replaceAll
    };
}

// Browser global exports
if (typeof window !== 'undefined') {
    window.EditorSearcher = EditorSearcher;
    
    // Standalone functions for backward compatibility
    window.doSearch = doSearch;
    window.findNext = findNext;
    window.findPrev = findPrev;
    window.replaceNext = replaceNext;
    window.replaceAll = replaceAll;
}
