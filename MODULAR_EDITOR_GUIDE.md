# Modular Markdown Editor Documentation

This documentation explains how to use the modular markdown editor system that was extracted from the original large `editor.html` file.

## 📁 Component Architecture

The editor has been broken down into the following modular components:

### 📋 Core Components

1. **`editor-modular.html`** - Main editor template that combines all components
2. **`toolbar.html`** - Formatting buttons and controls
3. **`search-toolbar.html`** - Search and replace interface

### 🎨 Styling Components

1. **`_markdown-shared.css`** - Unified styling for both editor preview and blog rendering
2. **`_codemirror.css`** - CodeMirror-specific styling (existing)

### ⚙️ JavaScript Components

1. **`markdown-live-preview.js`** - Obsidian-style live preview system
2. **`markdown-formatter.js`** - Text formatting utilities (existing)
3. **`editor-search.js`** - Advanced search and replace functionality
4. **`blog-markdown-renderer.js`** - Static blog content renderer

## 🚀 Quick Start

### Basic Editor Setup

To use the modular editor in your Django template:

```html
<!-- In your main template -->
<div class="editor-container">
    {% include 'zettelkasten/editor/editor-modular.html' %}
</div>
```

### Blog Rendering Setup

To render markdown content as static HTML in your blog:

```html
<!-- Load the shared CSS -->
<link rel="stylesheet" href="{% static 'css/03-pages/_markdown-shared.css' %}">

<!-- Your markdown content -->
<article class="blog-content markdown">
    {{ post.content|safe }}
</article>

<!-- Initialize blog renderer for enhanced features -->
<script src="{% static 'js/03-components/blog-markdown-renderer.js' %}"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const renderer = new BlogMarkdownRenderer({
            containerSelector: '.blog-content',
            enableTOC: true,
            enableCopyCode: true,
            enableLineNumbers: true
        });
        renderer.init();
    });
</script>
```

## 🔧 Component Usage

### Individual Component Usage

If you want to use components separately:

#### Just the Toolbar
```html
<!-- Load only the toolbar component -->
{% include 'zettelkasten/editor/toolbar.html' %}
<script src="{% static 'js/03-components/markdown-formatter.js' %}"></script>
```

#### Just the Search
```html
<!-- Load only the search component -->
{% include 'zettelkasten/editor/search-toolbar.html' %}
<script src="{% static 'js/03-components/editor-search.js' %}"></script>
```

#### Just the Live Preview
```html
<!-- Load only the live preview system -->
<link rel="stylesheet" href="{% static 'css/03-pages/_markdown-shared.css' %}">
<script src="{% static 'js/03-components/markdown-live-preview.js' %}"></script>

<script>
// Initialize with your CodeMirror instance
const livePreview = new MarkdownLivePreview(yourCodeMirrorEditor, {
    enabled: true,
    widgetClass: 'markdown-line-widget markdown'
});
</script>
```

### Shared Styling System

The `_markdown-shared.css` file provides consistent styling for both:

1. **Live Preview Widgets** - HTML rendered over CodeMirror lines
2. **Static Blog Content** - Regular HTML content in blog posts

#### CSS Classes Available:

- `.markdown` - Base container for all markdown content
- `.blog-content` - Specific container for blog posts
- `.markdown-line-widget` - Container for live preview widgets

## ⚙️ Configuration Options

### Live Preview Configuration

```javascript
const livePreview = new MarkdownLivePreview(editor, {
    enabled: true,                    // Enable preview by default
    widgetClass: 'markdown-line-widget markdown',  // CSS classes
    debounceDelay: 150,              // Delay before updating (ms)
    renderCodeBlocks: true,          // Render code blocks
    renderMath: false,               // Enable math rendering (requires MathJax)
    customRenderers: {               // Custom element renderers
        // Add custom rendering functions
    }
});
```

### Search Configuration

```javascript
const searcher = new EditorSearcher(editor, {
    caseSensitive: false,            // Case sensitivity
    wholeWord: false,                // Match whole words only
    regexp: false,                   // Regular expression search
    highlightClass: 'searching',     // CSS class for highlights
    maxMatches: 1000                 // Maximum matches to highlight
});
```

### Blog Renderer Configuration

```javascript
const renderer = new BlogMarkdownRenderer({
    containerSelector: '.blog-content',   // Container to process
    enableTOC: true,                     // Generate table of contents
    enableCopyCode: true,                // Add copy buttons to code blocks
    enableLineNumbers: true,             // Add line numbers to code
    tocSelector: '#table-of-contents',   // Where to inject TOC
    maxTocDepth: 3,                      // Maximum heading depth for TOC
    copyButtonText: 'Copy',              // Text for copy button
    copiedButtonText: 'Copied!'          // Text after successful copy
});
```

## 🎨 Styling Customization

### CSS Variables

The shared CSS uses CSS variables for easy theming:

```css
:root {
    /* Typography */
    --markdown-font-family: 'Inter', -apple-system, sans-serif;
    --markdown-font-size: clamp(1rem, 2.5vw, 1.125rem);
    --markdown-line-height: 1.6;
    
    /* Colors */
    --markdown-text-color: var(--color-gray-900);
    --markdown-bg-color: transparent;
    --markdown-border-color: var(--color-gray-200);
    
    /* Spacing */
    --markdown-spacing-xs: 0.5rem;
    --markdown-spacing-sm: 1rem;
    --markdown-spacing-md: 1.5rem;
    --markdown-spacing-lg: 2rem;
    
    /* Code styling */
    --markdown-code-font: 'Fira Code', 'Monaco', monospace;
    --markdown-code-bg: var(--color-gray-50);
    --markdown-code-border: var(--color-gray-200);
}
```

### Dark Mode Support

```css
[data-theme="dark"] {
    --markdown-text-color: var(--color-gray-100);
    --markdown-bg-color: var(--color-gray-900);
    --markdown-border-color: var(--color-gray-700);
    --markdown-code-bg: var(--color-gray-800);
    --markdown-code-border: var(--color-gray-600);
}
```

## 🔄 Migration from Original Editor

If you're migrating from the original large `editor.html` file:

### Step 1: Replace Template Include
```html
<!-- Old -->
{% include 'zettelkasten/editor.html' %}

<!-- New -->
{% include 'zettelkasten/editor/editor-modular.html' %}
```

### Step 2: Update CSS References
```html
<!-- Add the shared CSS -->
<link rel="stylesheet" href="{% static 'css/03-pages/_markdown-shared.css' %}">
```

### Step 3: Update JavaScript References
The new system automatically loads all components, but if you have custom code:

```javascript
// Old global access
window.editor = myCodeMirrorInstance;

// New global access (automatically available)
window.cmEditor        // CodeMirror instance
window.livePreview     // Live preview system
window.formatter       // Markdown formatter
window.searcher        // Search system
```

## 🧪 Testing Individual Components

### Test Live Preview
```javascript
// Toggle preview on/off
window.livePreview.toggle();

// Force update
window.livePreview.updatePreview();

// Check if enabled
console.log(window.livePreview.isEnabled());
```

### Test Formatter
```javascript
// Format selected text
window.formatter.format('bold');
window.formatter.format('italic');
window.formatter.format('heading', 2);
```

### Test Search
```javascript
// Search for text
window.searcher.search('example');

// Navigate results
window.searcher.findNext();
window.searcher.findPrevious();

// Replace
window.searcher.replaceNext('replacement');
window.searcher.replaceAll('replacement');
```

## 📚 Examples

### Custom Toolbar Button

Add a custom button to the toolbar:

```html
<!-- In toolbar.html -->
<button type="button" data-cmd="custom" title="Custom Action">
    <!-- Your icon -->
</button>
```

```javascript
// In your custom script
document.getElementById('formatting-toolbar').addEventListener('click', function(e) {
    const button = e.target.closest('button');
    if (button && button.dataset.cmd === 'custom') {
        // Your custom action
        window.formatter.customAction();
    }
});
```

### Custom Live Preview Renderer

```javascript
// Add custom element rendering
window.livePreview.addCustomRenderer('blockquote', function(element, content) {
    // Custom blockquote rendering
    return `<div class="custom-quote">${content}</div>`;
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Live preview not working**: Check that `marked.js` is loaded
2. **Styling not applied**: Ensure `_markdown-shared.css` is loaded
3. **Search not highlighting**: Check that search CSS is included
4. **Components not found**: Verify all component files are in correct paths

### Debug Mode

Enable debug logging:

```javascript
// Enable debug mode for components
window.livePreview.debug = true;
window.searcher.debug = true;
```

This modular system provides the same functionality as the original editor but with better maintainability, reusability, and extensibility.
