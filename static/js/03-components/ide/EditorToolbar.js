/**
 * MARKDOWN FORMATTING FUNCTIONS
 * 
 * This module provides functions for inserting markdown formatting syntax
 * into CodeMirror editor instances. Each function handles both selected text
 * and cursor-only scenarios with appropriate placeholder text.
 * 
 * FEATURES:
 * - Text formatting (bold, italic, strikethrough)
 * - Code formatting (inline code, code blocks)
 * - Structural elements (headers, lists, quotes, links)
 * - Smart selection handling
 * - Placeholder text for empty selections
 * 
 * USAGE:
 * Import or include this module and call formatText(editor, type) or use
 * individual formatting functions directly.
 * 
 * DEPENDENCIES:
 * - CodeMirror editor instance
 * - No external libraries required
 */

/**
 * MARKDOWN FORMATTER CLASS
 * 
 * Encapsulates all markdown formatting functionality in a reusable class.
 * This approach provides better organization and allows for configuration.
 */
class EditorToolbar {
    /**
     * CONSTRUCTOR: Initialize the formatter with an editor instance
     * 
     * @param {CodeMirror} editor - The CodeMirror editor instance to format
     * @param {Object} options - Configuration options
     * @param {Object} options.placeholders - Custom placeholder texts
     * @param {boolean} options.autoFocus - Whether to auto-focus editor after formatting (default: true)
     */
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Apply formatting to selected text or cursor position
     * @param {string} type - Type of formatting to apply
     */
    format(type) {
        const selection = this.editor.getSelection();
        const cursor = this.editor.getCursor();
        let replacement = '';
        let cursorOffset = 0; // Position to place cursor relative to start of replacement

        if (selection) {
            // Text is selected - wrap it with formatting
            switch(type) {
                case 'bold':
                    replacement = `**${selection}**`;
                    break;
                case 'italic':
                    replacement = `*${selection}*`;
                    break;
                case 'strikethrough':
                    replacement = `~~${selection}~~`;
                    break;
                case 'code':
                    replacement = `\`${selection}\``;
                    break;
                case 'codeblock':
                    replacement = `\`\`\`\n${selection}\n\`\`\``;
                    break;
                case 'link':
                    replacement = `[${selection}](url)`;
                    break;
                case 'header1':
                    replacement = `# ${selection}`;
                    break;
                case 'header2':
                    replacement = `## ${selection}`;
                    break;
                case 'header3':
                    replacement = `### ${selection}`;
                    break;
                case 'header4':
                    replacement = `#### ${selection}`;
                    break;
                case 'header5':
                    replacement = `##### ${selection}`;
                    break;
                case 'header6':
                    replacement = `###### ${selection}`;
                    break;
                case 'list':
                    replacement = `- ${selection}`;
                    break;
                case 'orderedlist':
                    replacement = `1. ${selection}`;
                    break;
                case 'quote':
                    replacement = `> ${selection}`;
                    break;
                case 'table':
                    replacement = `| Header 1 | Header 2 |\n|----------|----------|\n| ${selection} | Cell 2 |`;
                    break;
                case 'hr':
                    replacement = '\n---\n';
                    break;
                case 'image':
                    replacement = `![${selection}](image-url)`;
                    break;
                default:
                    console.warn(`Unknown formatting type: ${type}`);
                    return;
            }
        } else {
            // No selection - insert formatting with cursor positioned inside
            switch(type) {
                case 'bold':
                    replacement = '****';
                    cursorOffset = 2;
                    break;
                case 'italic':
                    replacement = '**';
                    cursorOffset = 1;
                    break;
                case 'strikethrough':
                    replacement = '~~~~';
                    cursorOffset = 2;
                    break;
                case 'code':
                    replacement = '``';
                    cursorOffset = 1;
                    break;
                case 'codeblock':
                    replacement = '```\n\n```';
                    cursorOffset = 4;
                    break;
                case 'link':
                    replacement = '[](url)';
                    cursorOffset = 1;
                    break;
                case 'header1':
                    replacement = '# ';
                    cursorOffset = 2;
                    break;
                case 'header2':
                    replacement = '## ';
                    cursorOffset = 3;
                    break;
                case 'header3':
                    replacement = '### ';
                    cursorOffset = 4;
                    break;
                case 'header4':
                    replacement = '#### ';
                    cursorOffset = 5;
                    break;
                case 'header5':
                    replacement = '##### ';
                    cursorOffset = 6;
                    break;
                case 'header6':
                    replacement = '###### ';
                    cursorOffset = 7;
                    break;
                case 'list':
                    replacement = '- ';
                    cursorOffset = 2;
                    break;
                case 'orderedlist':
                    replacement = '1. ';
                    cursorOffset = 3;
                    break;
                case 'quote':
                    replacement = '> ';
                    cursorOffset = 2;
                    break;
                case 'table':
                    replacement = '| Header 1 | Header 2 |\n|----------|----------|\n|  |  |';
                    cursorOffset = 54; // Position in first cell
                    break;
                case 'hr':
                    replacement = '\n---\n';
                    cursorOffset = 5;
                    break;
                case 'image':
                    replacement = '![](image-url)';
                    cursorOffset = 2;
                    break;
                default:
                    console.warn(`Unknown formatting type: ${type}`);
                    return;
            }
        }

        this.editor.replaceSelection(replacement);
        
        // If no selection was made, position cursor appropriately
        if (!selection && cursorOffset > 0) {
            const newCursor = {
                line: cursor.line,
                ch: cursor.ch + cursorOffset
            };
            this.editor.setCursor(newCursor);
        }
        
        this.editor.focus();
    }

    /**
     * Setup keyboard shortcuts for common formatting
     * @param {Object} extraKeys - Existing extraKeys object to extend
     * @returns {Object} - Extended extraKeys object
     */
    setupKeyboardShortcuts(extraKeys = {}) {
        return {
            ...extraKeys,
            "Ctrl-B": (cm) => this.format('bold'),
            "Ctrl-I": (cm) => this.format('italic'),
            "Ctrl-K": (cm) => this.format('link'),
            "Ctrl-Shift-C": (cm) => this.format('code'),
            "Ctrl-Shift-K": (cm) => this.format('codeblock'),
            "Ctrl-Shift-Q": (cm) => this.format('quote'),
            "Ctrl-1": (cm) => this.format('header1'),
            "Ctrl-2": (cm) => this.format('header2'),
            "Ctrl-3": (cm) => this.format('header3'),
            "Ctrl-4": (cm) => this.format('header4'),
            "Ctrl-5": (cm) => this.format('header5'),
            "Ctrl-6": (cm) => this.format('header6'),
        };
    }

    /**
     * Setup toolbar event handlers
     * @param {string} toolbarSelector - CSS selector for the toolbar
     */
    setupToolbar(toolbarSelector) {
        const toolbar = document.querySelector(toolbarSelector);
        if (!toolbar) {
            console.warn(`Toolbar not found: ${toolbarSelector}`);
            return;
        }

        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-cmd]');
            if (button) {
                const cmd = button.dataset.cmd;
                this.format(cmd);
                e.preventDefault();
            }
        });
    }

    /**
     * Create a toolbar element with formatting buttons
     * @param {Array} buttons - Array of button configurations
     * @returns {HTMLElement} - Toolbar element
     */
    createToolbar(buttons = null) {
        if (!buttons) {
            buttons = this.getDefaultButtons();
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'markdown-toolbar';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.cmd = button.cmd;
            btn.title = button.title;
            btn.innerHTML = button.icon;
            btn.className = button.className || '';
            
            toolbar.appendChild(btn);
        });

        // Setup event handler
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-cmd]');
            if (button) {
                const cmd = button.dataset.cmd;
                this.format(cmd);
                e.preventDefault();
            }
        });

        return toolbar;
    }

    /**
     * Get default button configurations
     * @returns {Array} - Default button configurations
     */
    getDefaultButtons() {
        return [
            { cmd: 'bold', title: 'Bold (Ctrl+B)', icon: '<strong>B</strong>' },
            { cmd: 'italic', title: 'Italic (Ctrl+I)', icon: '<em>I</em>' },
            { cmd: 'strikethrough', title: 'Strikethrough', icon: '<del>S</del>' },
            { cmd: 'code', title: 'Inline Code', icon: '<code>&lt;/&gt;</code>' },
            { cmd: 'link', title: 'Link (Ctrl+K)', icon: '🔗' },
            { cmd: 'header1', title: 'Header 1', icon: 'H1' },
            { cmd: 'header2', title: 'Header 2', icon: 'H2' },
            { cmd: 'header3', title: 'Header 3', icon: 'H3' },
            { cmd: 'list', title: 'Bullet List', icon: '• List' },
            { cmd: 'quote', title: 'Quote', icon: '❝' },
        ];
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorToolbar;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.EditorToolbar = EditorToolbar;
}
