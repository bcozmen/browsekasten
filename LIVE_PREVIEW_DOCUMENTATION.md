# Obsidian-Style Live Markdown Preview

## Implementation Overview

This implementation provides a live markdown preview feature similar to Obsidian's editor, where:

- The current line with cursor shows raw markdown (with syntax highlighting)
- All other lines are rendered as formatted markdown
- You can toggle between live preview mode and raw markdown mode

## Features Implemented

### 1. **Live Preview Rendering**
- Headers (H1-H6) with proper styling
- Bold and italic text formatting
- Strikethrough text
- Inline code with proper monospace styling
- Links with hover effects
- Lists (ordered and unordered)
- Blockquotes with left border styling
- Code blocks

### 2. **Interactive Elements**
- **Toggle Button**: Eye icon in the formatting toolbar to enable/disable live preview
- **Cursor-based Editing**: Current line always shows raw markdown for editing
- **Smooth Transitions**: Lines transition smoothly between raw and rendered states

### 3. **Styling Integration**
- Uses your existing CSS variable system
- Consistent with your green-themed color palette
- Proper typography scaling and spacing
- Responsive design considerations

## How to Use

1. **Enable Live Preview**: Click the eye icon in the formatting toolbar (enabled by default)
2. **Edit Text**: Click on any line to edit it in raw markdown format
3. **View Rendered**: Move cursor away from a line to see it rendered as formatted markdown
4. **Toggle Mode**: Click the eye icon again to switch back to full raw markdown mode

## Technical Implementation

### Files Modified/Created:
1. **`_markdown-preview.css`**: Complete markdown styling system
2. **`editor.html`**: Enhanced with live preview JavaScript
3. **`_codemirror.css`**: Updated with live preview specific styles

### Key Components:
- **MarkdownLivePreview Class**: Handles the preview logic
- **Line Widgets**: Used to overlay rendered content
- **CSS Classes**: Distinguish between editing and rendered states
- **Event Listeners**: Track cursor movement and content changes

## Next Steps

You can enhance this further by:

1. **Adding More Markdown Features**:
   - Tables rendering
   - Task lists with checkboxes
   - Code syntax highlighting
   - Math equations (KaTeX/MathJax)
   - Mermaid diagrams

2. **Performance Optimizations**:
   - Debounce rendering for large documents
   - Virtual scrolling for very long documents
   - Caching rendered content

3. **User Experience Improvements**:
   - Preview mode preferences (save user's choice)
   - Keyboard shortcuts for preview toggle
   - Line-by-line preview mode
   - Split-pane preview option

## Color Scheme Integration

The implementation uses your existing color variables:
- `--color-primary-*`: For headers and main text
- `--color-tertiary-*`: For secondary elements
- `--editor-*`: For syntax highlighting
- `--text-*`: For body text and content

This ensures the live preview maintains visual consistency with your application's design system.

## Browser Compatibility

- Modern browsers with ES6+ support
- CodeMirror 5.x compatibility
- CSS Grid and Flexbox support required
- WebKit/Blink scrollbar styling included
