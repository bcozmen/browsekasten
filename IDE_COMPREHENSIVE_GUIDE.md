# BrowseKasten IDE System - Complete Developer Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Detailed Documentation](#component-detailed-documentation)
4. [Implementation Guide](#implementation-guide)
5. [Usage Examples](#usage-examples)
6. [Customization Guide](#customization-guide)
7. [Troubleshooting](#troubleshooting)
8. [Performance Optimization](#performance-optimization)

---

## Overview

The BrowseKasten IDE System is a sophisticated, Obsidian-inspired development environment built with modern web technologies. It provides a complete integrated development experience for markdown editing with live preview, file management, multi-tab editing, and advanced text manipulation capabilities.

### Key Features
- **Obsidian-Style Live Preview**: Real-time markdown rendering with cursor-line editing
- **Advanced File Management**: Multi-selection, keyboard navigation, folder management
- **Multi-Tab Editor**: VSCode-like tab management with drag-and-drop reordering
- **Resizable Panels**: Professional IDE layout with persistent panel sizing
- **Integrated Components**: Search, formatting, auto-save, and keyboard shortcuts
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Editor**: CodeMirror 5.x with custom extensions
- **Markdown**: marked.js for parsing and rendering
- **Backend**: Django framework (API layer)
- **Storage**: LocalStorage for preferences, IndexedDB for file caching

---

## Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    IDEController                        │
│                 (Main Orchestrator)                     │
├─────────────────────────────────────────────────────────┤
│  FileManager  │  TabManager  │  PanelResizer  │ Editor  │
│               │              │                │ Factory │
├─────────────────────────────────────────────────────────┤
│           Core Components (Search, Preview, etc.)       │
├─────────────────────────────────────────────────────────┤
│                   CodeMirror Engine                     │
├─────────────────────────────────────────────────────────┤
│                   DOM / Browser APIs                    │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy
1. **IDEController** - Main orchestrator and state manager
2. **FileManager** - File tree operations and selection management
3. **TabManager** - Multi-tab interface and tab lifecycle management
4. **PanelResizer** - Layout management and panel resizing
5. **EditorFactory** - Editor instance creation and configuration
6. **MarkdownLivePreview** - Real-time preview rendering
7. **MarkdownFormatter** - Text formatting and toolbar management
8. **EditorSearcher** - Search and replace functionality

### Data Flow
```
User Action → IDEController → Component → Update UI → Event Callback
     ↑                                                        ↓
     └────────────── State Update ←─────────────────────────────┘
```

---

## Component Detailed Documentation

### 1. IDEController - Main Orchestrator

**Purpose**: Central command center that coordinates all IDE components and manages global state.

**Key Responsibilities**:
- Component lifecycle management
- Event routing between components
- Global keyboard shortcuts
- Auto-save functionality
- Recent files management
- Error handling and notifications

**Configuration Options**:
```javascript
const ideOptions = {
    autoSave: true,              // Enable auto-save
    autoSaveInterval: 30000,     // Auto-save every 30 seconds
    maxRecentFiles: 10,          // Track last 10 opened files
    enableHotkeys: true,         // Enable global hotkeys
    persistState: true           // Save state to localStorage
};
```

**Public Methods**:
```javascript
// File operations
ide.openFile(fileId, content)
ide.saveFile(fileId, content)
ide.createNewFile(filename, content)
ide.deleteFile(fileId)

// State management
ide.getOpenFiles()
ide.getRecentFiles()
ide.setActiveFile(fileId)

// Event handlers
ide.setOnFileLoad(callback)
ide.setOnFileSave(callback)
ide.setOnError(callback)
```

**Events Emitted**:
- `onFileLoad(fileData)` - File successfully loaded
- `onFileSave(fileData)` - File successfully saved
- `onError(error, context)` - Error occurred
- `onFileCreate(fileData)` - New file created
- `onFileDelete(fileId)` - File deleted

### 2. FileManager - Advanced File Explorer

**Purpose**: Provides Obsidian-like file exploration with sophisticated selection handling and keyboard navigation.

**Key Capabilities**:
- Multi-selection with Ctrl+click and Shift+click
- Keyboard navigation with arrow keys
- Folder collapse/expand with state persistence
- File operations (create, delete, rename, duplicate)
- Context menus for right-click operations
- Drag and drop (future feature)

**Selection Behaviors**:
```javascript
// Single selection
fileManager.selectFile('file-123')

// Multi-selection
fileManager.addToSelection('file-124')  // Ctrl+click equivalent
fileManager.selectRange('file-123', 'file-127')  // Shift+click range

// Keyboard navigation
fileManager.selectNext()     // Arrow down
fileManager.selectPrevious() // Arrow up
fileManager.extendSelectionDown() // Shift+arrow down
```

**Keyboard Shortcuts**:
- `↑↓` - Navigate up/down
- `←→` - Collapse/expand folders
- `Enter` - Open selected file(s)
- `Delete` - Delete selected file(s)
- `F2` - Rename selected file
- `Ctrl+N` - Create new file
- `Ctrl+Shift+N` - Create new folder
- `Ctrl+D` - Duplicate selected file
- `Ctrl+A` - Select all files
- `Escape` - Clear selection

### 3. TabManager - Multi-Tab Interface

**Purpose**: Manages multiple editor tabs with VSCode-like functionality including reordering, persistence, and advanced tab operations.

**Features**:
```javascript
// Tab operations
const tabId = tabManager.createTab(fileId, filename, content)
tabManager.closeTab(tabId)
tabManager.switchToTab(tabId)
tabManager.moveTab(tabId, newIndex)

// Tab states
tabManager.markTabModified(tabId, isModified)
tabManager.pinTab(tabId)
tabManager.unpinTab(tabId)

// Bulk operations
tabManager.closeAllTabs()
tabManager.closeOtherTabs(tabId)
tabManager.reopenClosedTab()
```

**Tab Behaviors**:
- **Left Click**: Switch to tab
- **Middle Click**: Close tab
- **Right Click**: Show context menu
- **Drag**: Reorder tabs
- **Close Button**: Close tab with unsaved changes confirmation

**Keyboard Shortcuts**:
- `Ctrl+T` - New tab
- `Ctrl+W` - Close current tab
- `Ctrl+Shift+T` - Reopen closed tab
- `Ctrl+Tab` - Next tab
- `Ctrl+Shift+Tab` - Previous tab
- `Ctrl+1-9` - Switch to tab by number

### 4. PanelResizer - Layout Management

**Purpose**: Provides professional IDE-style panel resizing with constraints, persistence, and smooth animations.

**Capabilities**:
```javascript
// Resize operations
resizer.resizePanel('sidebar', 300)     // Set specific width
resizer.collapsePanel('sidebar')        // Collapse panel
resizer.expandPanel('sidebar')          // Expand panel
resizer.resetAllSizes()                 // Reset to defaults

// Constraint management
resizer.setMinSize('sidebar', 200)      // Set minimum width
resizer.setMaxSize('sidebar', 600)      // Set maximum width
resizer.enableSnapping('sidebar', 10)   // Enable snap-to-edge
```

**Resize Features**:
- Smooth drag-based resizing
- Minimum/maximum size constraints
- Snap-to-edge functionality
- Double-click to reset sizes
- Keyboard fine-adjustment
- Touch support for mobile
- Size persistence across sessions

### 5. EditorFactory - Integrated Editor Creation

**Purpose**: Factory for creating fully-configured CodeMirror editors with all IDE components pre-integrated.

**Editor Configuration**:
```javascript
const editor = editorFactory.createEditor(tabId, content, {
    mode: 'markdown',           // Language mode
    theme: 'mytheme',          // Color theme
    enableLivePreview: true,   // Obsidian-style preview
    enableFormatter: true,     // Formatting toolbar
    enableSearch: true,        // Search functionality
    autoSave: true,           // Auto-save changes
    autoSaveDelay: 1000       // Auto-save delay (ms)
});
```

**Included Components**:
- **MarkdownLivePreview**: Real-time rendering
- **MarkdownFormatter**: Text formatting and toolbar
- **EditorSearcher**: Search and replace
- **Auto-save system**: Background saving
- **Keyboard shortcuts**: Integrated hotkeys

### 6. MarkdownLivePreview - Obsidian-Style Preview

**Purpose**: Provides real-time markdown rendering where cursor line shows raw markdown and other lines show rendered HTML.

**How It Works**:
1. Monitor cursor position in CodeMirror
2. Parse markdown content to HTML using marked.js
3. Create line widgets for non-cursor lines
4. Hide raw markdown text for widget lines
5. Update widgets on content/cursor changes

**Configuration**:
```javascript
const livePreview = new MarkdownLivePreview(editor, {
    enabled: true,                    // Initially enabled
    widgetClass: 'markdown-widget',   // CSS class for widgets
    debounceDelay: 100,              // Update delay (ms)
    mathJax: false,                  // MathJax integration
    syntaxHighlight: true            // Code syntax highlighting
});
```

**Supported Markdown Features**:
- Headers (H1-H6)
- Text formatting (bold, italic, strikethrough)
- Lists (ordered, unordered, task lists)
- Code blocks with syntax highlighting
- Inline code
- Links and images
- Blockquotes
- Tables
- Horizontal rules

### 7. MarkdownFormatter - Text Formatting

**Purpose**: Provides comprehensive text formatting capabilities with toolbar integration and keyboard shortcuts.

**Formatting Operations**:
```javascript
formatter.format('bold')           // **bold text**
formatter.format('italic')         // *italic text*
formatter.format('strikethrough')  // ~~strikethrough~~
formatter.format('code')           // `inline code`
formatter.format('header1')        // # Header 1
formatter.format('list')           // - List item
formatter.format('quote')          // > Blockquote
formatter.format('link')           // [text](url)
```

**Toolbar Integration**:
```javascript
// Create toolbar programmatically
const toolbar = formatter.createToolbar([
    { cmd: 'bold', title: 'Bold (Ctrl+B)', icon: '<b>B</b>' },
    { cmd: 'italic', title: 'Italic (Ctrl+I)', icon: '<i>I</i>' },
    // ... more buttons
]);

// Attach to existing toolbar
formatter.setupToolbar('#formatting-toolbar');
```

### 8. EditorSearcher - Search and Replace

**Purpose**: Advanced search and replace functionality with highlighting, navigation, and regular expression support.

**Search Operations**:
```javascript
// Basic search
searcher.search('search term')

// Search with options
searcher.search('pattern', {
    caseSensitive: false,
    useRegex: false,
    wholeWord: false
})

// Navigation
searcher.findNext()      // Go to next match
searcher.findPrevious()  // Go to previous match

// Replace operations
searcher.replace('replacement')     // Replace current match
searcher.replaceAll('replacement')  // Replace all matches
```

**Search Features**:
- Real-time highlighting of all matches
- Navigate between matches with wrap-around
- Case-sensitive and case-insensitive search
- Regular expression support
- Whole word matching
- Replace single or all occurrences
- Search statistics (match count, current match)

---

## Implementation Guide

### Step 1: Basic Setup

1. **HTML Structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="path/to/codemirror.css">
    <link rel="stylesheet" href="path/to/ide-styles.css">
</head>
<body>
    <div class="zettelkasten-container">
        <div class="file-manager-container">
            <!-- File manager content -->
        </div>
        <div class="resizer" id="resizer1"></div>
        <div class="editor-container">
            <!-- Editor content -->
        </div>
    </div>
    
    <!-- Scripts -->
    <script src="path/to/codemirror.js"></script>
    <script src="path/to/marked.js"></script>
    <script src="path/to/ide-components.js"></script>
</body>
</html>
```

2. **CSS Requirements**:
```css
/* Include these CSS files in order */
@import url('static/css/01-foundation/_variables.css');
@import url('static/css/05-editor/_codemirror.css');
@import url('static/css/05-editor/_ide-components.css');
@import url('static/css/03-pages/_markdown-shared.css');
```

3. **JavaScript Initialization**:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the IDE system
    const ide = new IDEController('.zettelkasten-container', {
        autoSave: true,
        autoSaveInterval: 30000,
        maxRecentFiles: 10
    });
    
    // Set up event handlers
    ide.setOnFileLoad((fileData) => {
        console.log('File loaded:', fileData.filename);
    });
    
    ide.setOnFileSave((fileData) => {
        console.log('File saved:', fileData.filename);
    });
    
    ide.setOnError((error, context) => {
        console.error('IDE Error:', error, context);
    });
});
```

### Step 2: Component Integration

1. **File Manager Integration**:
```javascript
// Access file manager through IDE controller
const fileManager = ide.fileManager;

// Set up custom event handlers
fileManager.onFileSelect = (selectedFiles) => {
    console.log('Selected files:', selectedFiles);
};

fileManager.onFileOpen = (file) => {
    ide.openFile(file.id, file.content);
};
```

2. **Tab Manager Integration**:
```javascript
// Access tab manager
const tabManager = ide.tabManager;

// Customize tab behavior
tabManager.onTabCreate = (tab) => {
    console.log('New tab created:', tab.id);
};

tabManager.onTabClose = (tabId) => {
    console.log('Tab closed:', tabId);
};
```

3. **Editor Factory Integration**:
```javascript
// Create custom editor instances
const editor = ide.editorFactory.createEditor('my-tab-id', 'Initial content', {
    mode: 'javascript',
    theme: 'dark-theme',
    enableLivePreview: false  // Disable for non-markdown
});
```

### Step 3: Advanced Configuration

1. **Custom Themes**:
```css
/* Define custom CodeMirror theme */
.cm-s-mytheme.CodeMirror {
    background: var(--editor-background);
    color: var(--editor-text);
}

.cm-s-mytheme .cm-keyword {
    color: var(--editor-keyword);
}

/* Add more theme rules */
```

2. **Custom Keyboard Shortcuts**:
```javascript
// Add custom shortcuts to editor
const extraKeys = {
    'Ctrl-Shift-F': function(cm) {
        // Custom find in files functionality
        showFindInFilesDialog();
    },
    'F11': function(cm) {
        // Toggle fullscreen
        toggleFullscreen();
    }
};

// Apply to editor factory
ide.editorFactory.options.extraKeys = extraKeys;
```

3. **Plugin Integration**:
```javascript
// Extend IDE with custom plugins
class CustomPlugin {
    constructor(ide) {
        this.ide = ide;
        this.init();
    }
    
    init() {
        // Add custom functionality
        this.ide.addCommand('myCustomCommand', this.execute.bind(this));
    }
    
    execute() {
        console.log('Custom plugin executed');
    }
}

// Register plugin
const plugin = new CustomPlugin(ide);
```

---

## Usage Examples

### Example 1: Simple Text Editor
```javascript
// Minimal setup for basic text editing
const ide = new IDEController('.editor-container', {
    autoSave: false,
    enableHotkeys: false
});

// Open a file
ide.openFile('doc1', 'Initial content');
```

### Example 2: Full-Featured Markdown IDE
```javascript
// Complete markdown editing environment
const ide = new IDEController('.zettelkasten-container', {
    autoSave: true,
    autoSaveInterval: 15000,
    maxRecentFiles: 20,
    enableHotkeys: true
});

// Configure file manager
ide.fileManager.options.multiSelect = true;
ide.fileManager.onFileOpen = (file) => {
    ide.openFile(file.id, file.content);
};

// Configure tab manager
ide.tabManager.options.maxTabs = 15;
ide.tabManager.options.enableReordering = true;

// Set up auto-save callback
ide.setOnFileSave((fileData) => {
    // Send to server
    fetch('/api/save-file', {
        method: 'POST',
        body: JSON.stringify(fileData),
        headers: { 'Content-Type': 'application/json' }
    });
});
```

### Example 3: Custom Editor for Specific File Types
```javascript
// Specialized editor for different file types
ide.editorFactory.registerFileTypeHandler('js', (content, options) => {
    return ide.editorFactory.createEditor(options.tabId, content, {
        mode: 'javascript',
        enableLivePreview: false,
        enableFormatter: false,
        extraKeys: {
            'Ctrl-Enter': function(cm) {
                executeJavaScript(cm.getValue());
            }
        }
    });
});

ide.editorFactory.registerFileTypeHandler('md', (content, options) => {
    return ide.editorFactory.createEditor(options.tabId, content, {
        mode: 'markdown',
        enableLivePreview: true,
        enableFormatter: true
    });
});
```

---

## Customization Guide

### Theming and Styling

1. **CSS Variable Customization**:
```css
:root {
    /* Override default colors */
    --ide-background: #1e1e1e;
    --ide-text-color: #d4d4d4;
    --ide-border-color: #3e3e3e;
    
    /* Tab styling */
    --tab-background: #2d2d30;
    --tab-active-background: #1e1e1e;
    --tab-hover-background: #3e3e3e;
    
    /* File manager */
    --file-manager-background: #252526;
    --file-selected-background: #094771;
    
    /* Editor */
    --editor-background: #1e1e1e;
    --editor-line-number: #858585;
    --editor-cursor: #ffffff;
}
```

2. **Custom Component Styling**:
```css
/* Style file manager items */
.file-manager-container .file.custom {
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    color: white;
    border-radius: 8px;
}

/* Style tabs */
.tab.special {
    background: var(--color-warning);
    color: var(--color-warning-contrast);
}

/* Style editor toolbar */
.editor-toolbar .custom-button {
    background: var(--color-success);
    border-radius: 50%;
}
```

### Adding Custom Commands

```javascript
// Add custom commands to IDE
ide.addCommand('insertDate', {
    name: 'Insert Current Date',
    keybinding: 'Ctrl-Shift-D',
    execute: (editor) => {
        const date = new Date().toISOString().split('T')[0];
        editor.replaceSelection(date);
    }
});

ide.addCommand('formatTable', {
    name: 'Format Markdown Table',
    keybinding: 'Ctrl-Shift-T',
    execute: (editor) => {
        const selection = editor.getSelection();
        const formatted = formatMarkdownTable(selection);
        editor.replaceSelection(formatted);
    }
});
```

### Custom File Operations

```javascript
// Add custom file operations
ide.fileManager.addOperation('encrypt', {
    name: 'Encrypt File',
    icon: '🔒',
    execute: async (fileIds) => {
        for (const fileId of fileIds) {
            const content = await ide.getFileContent(fileId);
            const encrypted = encryptContent(content);
            await ide.saveFile(fileId, encrypted);
        }
    }
});

ide.fileManager.addOperation('backup', {
    name: 'Create Backup',
    icon: '💾',
    execute: async (fileIds) => {
        for (const fileId of fileIds) {
            const content = await ide.getFileContent(fileId);
            const backupId = `${fileId}_backup_${Date.now()}`;
            await ide.createFile(backupId, content);
        }
    }
});
```

---

## Troubleshooting

### Common Issues and Solutions

1. **IDE Not Initializing**:
```javascript
// Check for missing dependencies
if (typeof CodeMirror === 'undefined') {
    console.error('CodeMirror not loaded');
}

if (typeof marked === 'undefined') {
    console.error('marked.js not loaded');
}

// Verify container exists
const container = document.querySelector('.zettelkasten-container');
if (!container) {
    console.error('IDE container not found');
}
```

2. **Live Preview Not Working**:
```javascript
// Check if marked.js is available
if (typeof marked === 'undefined') {
    console.error('marked.js required for live preview');
}

// Verify CSS classes
const hasStyles = document.querySelector('style,link[href*="markdown"]');
if (!hasStyles) {
    console.warn('Markdown CSS styles not loaded');
}
```

3. **Auto-save Issues**:
```javascript
// Debug auto-save
ide.setOnError((error, context) => {
    if (context === 'auto-save') {
        console.error('Auto-save failed:', error);
        // Implement fallback save mechanism
        localStorage.setItem('emergency-backup', JSON.stringify({
            content: editor.getValue(),
            timestamp: Date.now()
        }));
    }
});
```

4. **Performance Issues**:
```javascript
// Monitor performance
ide.setOnPerformanceIssue((metric) => {
    console.warn('Performance issue detected:', metric);
    
    if (metric.type === 'slow-render') {
        // Disable live preview temporarily
        ide.editorFactory.options.enableLivePreview = false;
    }
    
    if (metric.type === 'memory-high') {
        // Close inactive tabs
        ide.tabManager.closeInactiveTabs();
    }
});
```

### Debug Mode

```javascript
// Enable comprehensive debugging
const ide = new IDEController('.zettelkasten-container', {
    debug: true,
    verbose: true,
    logPerformance: true
});

// View internal state
console.log('IDE State:', {
    openFiles: ide.getOpenFiles(),
    activeTab: ide.tabManager.getActiveTab(),
    selectedFiles: ide.fileManager.getSelectedFiles(),
    panelSizes: ide.panelResizer.getSizes()
});
```

---

## Performance Optimization

### Memory Management

1. **Editor Instance Cleanup**:
```javascript
// Properly destroy editors when tabs are closed
ide.tabManager.onTabClose = (tabId) => {
    const editor = ide.editorFactory.getEditor(tabId);
    if (editor) {
        // Clean up editor resources
        editor.livePreview.destroy();
        editor.formatter.destroy();
        editor.searcher.destroy();
        editor.cm.toTextArea();
        
        // Remove from factory
        ide.editorFactory.destroyEditor(tabId);
    }
};
```

2. **File Manager Optimization**:
```javascript
// Virtualize large file lists
ide.fileManager.enableVirtualization({
    itemHeight: 25,
    bufferSize: 10,
    maxRenderedItems: 100
});

// Lazy load file contents
ide.fileManager.setContentLoader(async (fileId) => {
    // Load content only when needed
    return await fetch(`/api/files/${fileId}/content`).then(r => r.text());
});
```

3. **Auto-save Optimization**:
```javascript
// Debounce auto-save to reduce API calls
const debouncedSave = debounce((fileId, content) => {
    ide.saveFile(fileId, content);
}, 2000);

// Use efficient change detection
ide.editorFactory.options.onChange = (editor, change) => {
    if (change.origin !== 'setValue') {  // Ignore programmatic changes
        const fileId = editor.tabId;
        const content = editor.getValue();
        debouncedSave(fileId, content);
    }
};
```

### Rendering Performance

1. **Live Preview Optimization**:
```javascript
// Use requestAnimationFrame for smooth rendering
ide.editorFactory.options.livePreviewOptions = {
    renderStrategy: 'raf',  // Use requestAnimationFrame
    batchUpdates: true,     // Batch DOM updates
    virtualScrolling: true, // Render only visible content
    debounceDelay: 150     // Increased debounce for better performance
};
```

2. **Search Performance**:
```javascript
// Optimize search for large documents
ide.editorFactory.options.searchOptions = {
    maxMatches: 1000,       // Limit match highlighting
    chunkSize: 10000,       // Process in chunks
    useWebWorker: true      // Offload to web worker
};
```

---

This comprehensive guide provides everything needed to understand, implement, and customize the BrowseKasten IDE System. The modular architecture allows for easy extension and customization while maintaining professional IDE functionality.
