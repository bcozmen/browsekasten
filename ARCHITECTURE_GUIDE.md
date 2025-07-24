# BrowseKasten Architecture Guide

## Overview
This document outlines the restructured folder organization for JavaScript and CSS files, designed to improve maintainability and logical grouping of related functionality.

## JavaScript Structure

### Current Structure (Restructured)
```
static/js/
├── main.js                     # ES6 module entry point
├── 02-core/                    # Core utilities and state management
│   ├── theme-color.js
│   ├── utils.js
│   ├── state.js
│   ├── api.js
│   └── dom.js
├── 03-components/              # Reusable UI components
│   ├── ui/                     # General UI components
│   │   ├── contextMenu.js
│   │   ├── dropdown.js
│   │   └── modal.js
│   ├── editor/                 # Editor-specific components
│   │   ├── editor-search.js
│   │   ├── markdown-formatter.js
│   │   ├── markdown-live-preview.js
│   │   └── codemirror-search.js
│   ├── blog/                   # Blog-specific components
│   │   └── blog-markdown-renderer.js
│   └── ide/                    # IDE system components
│       ├── FileManager.js      # Obsidian-like file explorer
│       ├── TabManager.js       # Multi-tab editor support
│       ├── PanelResizer.js     # Resizable panels
│       ├── EditorFactory.js    # Integrated editor creation
│       ├── IDEController.js    # Main orchestrator
│       ├── markdown-live-preview.js    # Live preview component
│       ├── markdown-formatter.js       # Text formatting
│       ├── editor-search.js            # Search and replace
│       └── codemirror-search.js        # CodeMirror search addon
└── 04-pages/                   # Page-specific scripts
    ├── home.js
    ├── dashboard.js
    ├── blog.js
    └── zettelkasten.js
```

### Loading Strategy

#### Global Scripts (main.js)
- Loaded on every page via `<script type="module" src="main.js">`
- Should only include essential functionality needed site-wide
- Uses ES6 imports for better dependency management

#### Page-Specific Scripts
- Loaded via `{% block extra_js %}` in templates
- Example: Blog page loads blog-specific components
- Editor loads specialized editor components directly in template

#### Editor Components
- **Valid pattern**: Loading directly in `editor.html` template
- **Reason**: Editor is a specialized tool requiring specific libraries (CodeMirror, marked.js)
- **Benefits**: Faster initial page load, editor-only dependencies

## CSS Structure

### Current Structure (Restructured)
```
static/css/
├── main.css                    # Main import file
├── 01-foundation/              # Base styles and variables
│   ├── _variables.css
│   ├── _main.css
│   ├── _navbar.css
│   └── _typography.css
├── 02-components/              # Reusable component styles
│   ├── _cards.css
│   └── ui/                     # UI component styles
│       ├── _buttons.css
│       └── _forms.css
├── 03-pages/                   # Page-specific styles
│   ├── _file_manager.css
│   ├── _markdown-shared.css    # Shared markdown styles
│   ├── _zettelkasten.css
│   ├── _network.css
│   └── blog.css
├── 04-utilities/               # Utility classes
│   └── _responsive.css
└── 05-editor/                  # Editor-specific styles
    ├── _codemirror.css
    ├── _editor.css
    ├── _markdown-preview.css
    └── _ide-components.css     # IDE system styles
```

### Import Strategy
All styles are imported through `main.css` for single-file loading and optimal caching.

## Design Principles

### JavaScript
1. **Modular**: Each component is self-contained
2. **Lazy Loading**: Only load what's needed per page
3. **ES6 Modules**: Modern import/export syntax
4. **Separation of Concerns**: Core, components, and pages are distinct

### CSS
1. **Atomic Design**: Foundation → Components → Pages → Utilities
2. **Editor Isolation**: Complex editor styles separated
3. **Shared Patterns**: `_markdown-shared.css` for consistent rendering
4. **Semantic Naming**: Clear folder and file purposes

## Migration Benefits

### Before Restructuring
- ❌ 8 mixed components in single folder
- ❌ Editor styles buried in pages/editor/
- ❌ No clear separation between UI types
- ❌ Inconsistent organization

### After Restructuring
- ✅ Clear separation by function (ui, editor, blog)
- ✅ Dedicated editor folder at top level
- ✅ Logical grouping reduces cognitive load
- ✅ Easier to locate and maintain files
- ✅ Future additions have clear homes

## Usage Guidelines

### Adding New Components
- **UI Component**: Add to `03-components/ui/`
- **Editor Feature**: Add to `03-components/editor/`
- **Blog Feature**: Add to `03-components/blog/`
- **Page Script**: Add to `04-pages/`

### Adding New Styles
- **General Component**: Add to `02-components/`
- **UI Component**: Add to `02-components/ui/`
- **Page-Specific**: Add to `03-pages/`
- **Editor-Related**: Add to `05-editor/`

### Import Patterns
```javascript
// For general UI components
import { Modal } from './03-components/ui/modal.js';

// For editor features  
import { LivePreview } from './03-components/editor/markdown-live-preview.js';

// For core utilities
import { api } from './02-core/api.js';
```

## IDE System Architecture

### Core Components

#### FileManager Class
- **Purpose**: Obsidian-like file explorer with advanced selection capabilities
- **Features**: 
  - Folder collapse/expand with state persistence
  - Multi-selection (Ctrl+click, Shift+click, keyboard navigation)
  - Context menus and keyboard shortcuts
  - File operations (create, delete, rename)
  - Middle-click for new tabs
- **Events**: File selection, file opening, file creation/deletion

#### TabManager Class
- **Purpose**: Multi-tab editor system with reordering and persistence
- **Features**:
  - Unlimited tabs with configurable maximum
  - Tab reordering via drag-and-drop
  - Keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+Tab)
  - Modified file indicators
  - Tab persistence across sessions
- **Events**: Tab creation, closing, switching, reordering

#### PanelResizer Class
- **Purpose**: Smooth resizable panels with constraints and persistence
- **Features**:
  - Horizontal and vertical panel resizing
  - Minimum/maximum size constraints
  - Smooth animations and visual feedback
  - Keyboard shortcuts for adjustment
  - Size persistence and restoration
- **Events**: Panel resize, collapse/expand

#### EditorFactory Class
- **Purpose**: Creates fully-integrated editor instances with all components
- **Features**:
  - CodeMirror integration with live preview, formatter, and search
  - Auto-save functionality with configurable delays
  - Toolbar generation with formatting buttons
  - Theme management across all editors
  - Change tracking and modification indicators
- **Integration**: Used by IDEController to create tab-specific editors

#### IDEController Class
- **Purpose**: Main orchestrator that coordinates all IDE components
- **Features**:
  - File loading and saving with auto-save
  - Component integration and event routing
  - Global keyboard shortcuts
  - Recent files management
  - Error handling and notifications
- **Integration**: Connects FileManager, TabManager, and PanelResizer

### Usage Pattern

```javascript
// Initialize the complete IDE system
const ide = new IDEController('.zettelkasten-container');

// Set up event handlers
ide.setOnFileLoad((fileData) => console.log('File loaded:', fileData));
ide.setOnFileSave((fileData) => console.log('File saved:', fileData));

// Open a file programmatically
ide.openFile('file-id-123');

// Create a new file
ide.createNewFile('MyNote.md', '# Hello World');
```

### Future Extensions
- Multiple editor containers (split view)
- Plugin system for custom functionality
- Advanced search and replace across files
- Version control integration
- Real-time collaboration

## Performance Considerations

### JavaScript
- Editor loads ~200KB of CodeMirror libraries only when needed
- Main bundle stays lightweight for general pages
- Components can be imported individually

### CSS
- Single main.css file for optimal caching
- Editor styles only loaded when editor is used
- Shared markdown styles prevent duplication

## Backward Compatibility
All import paths have been updated. No breaking changes to functionality, only improved organization.
