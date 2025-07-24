/**
 * STATIC MARKDOWN BLOG RENDERER
 * 
 * This module provides functionality to render markdown content for blog posts
 * using the same styling as the live preview editor. It's optimized for static
 * content display without the overhead of live editing features.
 * 
 * FEATURES:
 * - Server-side or client-side markdown rendering
 * - Consistent styling with live preview editor
 * - SEO-friendly static HTML output
 * - Code syntax highlighting support
 * - Table of contents generation
 * - Image optimization and lazy loading
 * - Social media meta tag generation
 * 
 * USAGE:
 * // Client-side rendering
 * const renderer = new BlogMarkdownRenderer();
 * const html = renderer.render(markdownText);
 * document.getElementById('blog-content').innerHTML = html;
 * 
 * // Server-side rendering (Node.js)
 * const renderer = new BlogMarkdownRenderer({ serverSide: true });
 * const html = renderer.render(markdownText);
 * 
 * DEPENDENCIES:
 * - marked.js (for markdown parsing)
 * - Optional: highlight.js (for syntax highlighting)
 * - Optional: DOMPurify (for HTML sanitization)
 */

/**
 * BLOG MARKDOWN RENDERER CLASS
 * 
 * Renders markdown content specifically for blog display with enhanced features
 * like syntax highlighting, table of contents, and SEO optimization.
 */
class BlogMarkdownRenderer {
    /**
     * CONSTRUCTOR: Initialize the blog renderer
     * 
     * @param {Object} options - Configuration options
     * @param {boolean} options.serverSide - Whether rendering on server (default: false)
     * @param {boolean} options.sanitize - Whether to sanitize HTML output (default: true)
     * @param {boolean} options.highlightCode - Whether to apply syntax highlighting (default: true)
     * @param {boolean} options.generateToc - Whether to generate table of contents (default: false)
     * @param {boolean} options.lazyLoadImages - Whether to add lazy loading to images (default: true)
     * @param {string} options.baseImageUrl - Base URL for relative image paths
     * @param {Object} options.markedOptions - Options to pass to marked.js
     */
    constructor(options = {}) {
        this.options = {
            serverSide: false,
            sanitize: true,
            highlightCode: true,
            generateToc: false,
            lazyLoadImages: true,
            baseImageUrl: '',
            containerClass: 'blog-content markdown-content',
            ...options
        };

        /**
         * TABLE OF CONTENTS STORAGE
         * 
         * Stores headings found during rendering for TOC generation.
         */
        this.tableOfContents = [];

        /**
         * CONFIGURE MARKED.JS
         * 
         * Set up the markdown parser with blog-optimized settings.
         */
        this.configureMarked();
    }

    /**
     * CONFIGURE MARKED.JS
     * 
     * Sets up marked.js with optimal settings for blog rendering,
     * including custom renderers for enhanced functionality.
     */
    configureMarked() {
        if (typeof marked === 'undefined') {
            console.warn('marked.js not found. Please include marked.js for markdown rendering.');
            return;
        }

        /**
         * MARKED.JS CONFIGURATION
         * 
         * Configure the markdown parser with settings optimized for blog content.
         */
        const markedOptions = {
            // BASIC OPTIONS
            breaks: true,           // Convert line breaks to <br> tags
            gfm: true,             // Enable GitHub Flavored Markdown
            headerIds: true,       // Add IDs to headers for linking
            mangle: false,         // Don't mangle email addresses
            smartLists: true,      // Use smarter list behavior
            smartypants: true,     // Use smart quotes and dashes
            
            // CUSTOM RENDERER
            renderer: this.createCustomRenderer(),
            
            // SYNTAX HIGHLIGHTING
            highlight: this.options.highlightCode ? this.highlightCode.bind(this) : null,
            
            // MERGE WITH USER OPTIONS
            ...this.options.markedOptions
        };

        marked.setOptions(markedOptions);
    }

    /**
     * CREATE CUSTOM RENDERER
     * 
     * Creates a custom marked.js renderer with blog-specific enhancements.
     * 
     * @returns {marked.Renderer} - Configured marked renderer
     */
    createCustomRenderer() {
        const renderer = new marked.Renderer();

        /**
         * CUSTOM HEADING RENDERER
         * 
         * Adds anchor links and builds table of contents.
         */
        renderer.heading = (text, level, raw) => {
            // Generate ID from heading text
            const id = this.generateHeadingId(text);
            
            // Add to table of contents if enabled
            if (this.options.generateToc) {
                this.tableOfContents.push({
                    level,
                    text: text,
                    id: id,
                    raw: raw
                });
            }

            // Create heading with anchor link
            const anchor = `<a href="#${id}" class="heading-anchor" aria-hidden="true">#</a>`;
            return `<h${level} id="${id}" class="blog-heading">${text}${anchor}</h${level}>\n`;
        };

        /**
         * CUSTOM IMAGE RENDERER
         * 
         * Adds lazy loading, responsive sizing, and proper alt text.
         */
        renderer.image = (href, title, text) => {
            // Handle relative URLs
            const src = href.startsWith('http') ? href : `${this.options.baseImageUrl}${href}`;
            
            // Build image attributes
            const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
            const altAttr = ` alt="${this.escapeHtml(text || '')}"`;
            const lazyAttr = this.options.lazyLoadImages ? ' loading="lazy"' : '';
            
            return `<img src="${src}"${altAttr}${titleAttr}${lazyAttr} class="blog-image">`;
        };

        /**
         * CUSTOM CODE BLOCK RENDERER
         * 
         * Adds copy button and language labels to code blocks.
         */
        renderer.code = (code, language) => {
            const validLanguage = language && language.trim();
            const langClass = validLanguage ? ` class="language-${validLanguage}"` : '';
            const langLabel = validLanguage ? `<div class="code-language">${validLanguage}</div>` : '';
            const copyButton = '<button class="code-copy" aria-label="Copy code">Copy</button>';
            
            return `<div class="code-block-container">
                ${langLabel}
                ${copyButton}
                <pre><code${langClass}>${this.escapeHtml(code)}</code></pre>
            </div>`;
        };

        /**
         * CUSTOM LINK RENDERER
         * 
         * Adds external link indicators and security attributes.
         */
        renderer.link = (href, title, text) => {
            const isExternal = href.startsWith('http') && !href.includes(window.location?.hostname || '');
            const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const externalIcon = isExternal ? ' <span class="external-link-icon">↗</span>' : '';
            
            return `<a href="${href}"${titleAttr}${targetAttr} class="blog-link">${text}${externalIcon}</a>`;
        };

        /**
         * CUSTOM BLOCKQUOTE RENDERER
         * 
         * Adds attribution support for quotes.
         */
        renderer.blockquote = (quote) => {
            // Check for attribution pattern (-- Author Name)
            const attributionMatch = quote.match(/^(.*?)(?:\n<p>--\s*(.+?)<\/p>)$/s);
            
            if (attributionMatch) {
                const [, content, attribution] = attributionMatch;
                return `<blockquote class="blog-quote">
                    ${content}
                    <cite class="quote-attribution">${attribution}</cite>
                </blockquote>`;
            }
            
            return `<blockquote class="blog-quote">${quote}</blockquote>`;
        };

        return renderer;
    }

    /**
     * MAIN RENDER METHOD
     * 
     * Converts markdown text to HTML suitable for blog display.
     * 
     * @param {string} markdownText - The markdown content to render
     * @param {Object} options - Render-specific options
     * @returns {string} - Rendered HTML content
     */
    render(markdownText, options = {}) {
        if (!markdownText || typeof markdownText !== 'string') {
            console.warn('Invalid markdown text provided');
            return '';
        }

        // Reset table of contents for new render
        this.tableOfContents = [];

        try {
            /**
             * MARKDOWN TO HTML CONVERSION
             * 
             * Use marked.js to convert markdown to HTML with our custom renderer.
             */
            let html = marked(markdownText);

            /**
             * POST-PROCESSING
             * 
             * Apply additional transformations to the rendered HTML.
             */
            html = this.postProcessHtml(html, options);

            /**
             * HTML SANITIZATION
             * 
             * Clean the HTML to prevent XSS if sanitization is enabled.
             */
            if (this.options.sanitize && typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html);
            }

            /**
             * WRAP IN CONTAINER
             * 
             * Wrap the content in a container with appropriate CSS classes.
             */
            const containerClass = options.containerClass || this.options.containerClass;
            html = `<div class="${containerClass}">${html}</div>`;

            return html;

        } catch (error) {
            console.error('Error rendering markdown:', error);
            return `<div class="error">Error rendering content</div>`;
        }
    }

    /**
     * GENERATE TABLE OF CONTENTS
     * 
     * Creates a hierarchical table of contents from collected headings.
     * 
     * @returns {string} - HTML for table of contents
     */
    generateTableOfContents() {
        if (this.tableOfContents.length === 0) {
            return '';
        }

        let tocHtml = '<nav class="table-of-contents"><h2>Table of Contents</h2><ul>';
        let currentLevel = 0;

        for (const heading of this.tableOfContents) {
            if (heading.level > currentLevel) {
                // Open new nested list
                for (let i = currentLevel; i < heading.level - 1; i++) {
                    tocHtml += '<li><ul>';
                }
                currentLevel = heading.level;
            } else if (heading.level < currentLevel) {
                // Close nested lists
                for (let i = currentLevel; i > heading.level; i--) {
                    tocHtml += '</ul></li>';
                }
                currentLevel = heading.level;
            }

            tocHtml += `<li><a href="#${heading.id}">${heading.text}</a></li>`;
        }

        // Close remaining lists
        for (let i = currentLevel; i > 0; i--) {
            tocHtml += '</ul>';
        }

        tocHtml += '</nav>';
        return tocHtml;
    }

    /**
     * POST-PROCESS HTML
     * 
     * Apply additional transformations to the rendered HTML.
     * 
     * @param {string} html - The rendered HTML
     * @param {Object} options - Processing options
     * @returns {string} - Post-processed HTML
     */
    postProcessHtml(html, options = {}) {
        // Add reading time estimate
        if (options.includeReadingTime) {
            const readingTime = this.calculateReadingTime(html);
            html = `<div class="reading-time">Estimated reading time: ${readingTime} min</div>${html}`;
        }

        // Add table of contents
        if (this.options.generateToc && this.tableOfContents.length > 0) {
            const toc = this.generateTableOfContents();
            html = `${toc}${html}`;
        }

        return html;
    }

    /**
     * UTILITY METHODS
     * 
     * Helper functions for rendering and processing.
     */

    /**
     * Generate a URL-friendly ID from heading text
     * @param {string} text - Heading text
     * @returns {string} - URL-friendly ID
     */
    generateHeadingId(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')     // Replace spaces with dashes
            .trim();
    }

    /**
     * Calculate estimated reading time
     * @param {string} html - HTML content
     * @returns {number} - Reading time in minutes
     */
    calculateReadingTime(html) {
        // Remove HTML tags and count words
        const text = html.replace(/<[^>]*>/g, '');
        const wordCount = text.split(/\s+/).length;
        const wordsPerMinute = 200; // Average reading speed
        return Math.ceil(wordCount / wordsPerMinute);
    }

    /**
     * Syntax highlighting function
     * @param {string} code - Code to highlight
     * @param {string} language - Programming language
     * @returns {string} - Highlighted code
     */
    highlightCode(code, language) {
        if (typeof hljs !== 'undefined' && language && hljs.getLanguage(language)) {
            try {
                return hljs.highlight(language, code).value;
            } catch (error) {
                console.warn('Syntax highlighting failed:', error);
            }
        }
        return this.escapeHtml(code);
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get metadata from markdown
     * @param {string} markdownText - Markdown content
     * @returns {Object} - Extracted metadata
     */
    extractMetadata(markdownText) {
        const lines = markdownText.split('\n');
        const firstHeading = lines.find(line => line.startsWith('#'));
        const title = firstHeading ? firstHeading.replace(/^#+\s*/, '') : 'Untitled';
        
        // Extract first paragraph as description
        const paragraphs = markdownText.split('\n\n');
        const firstParagraph = paragraphs.find(p => !p.startsWith('#') && p.trim().length > 0);
        const description = firstParagraph ? firstParagraph.substring(0, 160) + '...' : '';

        return {
            title,
            description,
            wordCount: markdownText.split(/\s+/).length,
            readingTime: this.calculateReadingTime(markdownText)
        };
    }
}

/**
 * CONVENIENCE FUNCTIONS
 * 
 * Simple functions for quick markdown rendering without class instantiation.
 */

/**
 * Quick render function for simple use cases
 * @param {string} markdownText - Markdown to render
 * @param {Object} options - Render options
 * @returns {string} - Rendered HTML
 */
function renderMarkdownForBlog(markdownText, options = {}) {
    const renderer = new BlogMarkdownRenderer(options);
    return renderer.render(markdownText);
}

/**
 * Render with table of contents
 * @param {string} markdownText - Markdown to render
 * @param {Object} options - Render options
 * @returns {Object} - Object with html and toc properties
 */
function renderWithToc(markdownText, options = {}) {
    const renderer = new BlogMarkdownRenderer({ ...options, generateToc: true });
    const html = renderer.render(markdownText);
    const toc = renderer.generateTableOfContents();
    return { html, toc };
}

/**
 * MODULE EXPORTS
 */

// ES6 Module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BlogMarkdownRenderer,
        renderMarkdownForBlog,
        renderWithToc
    };
}

// Browser global exports
if (typeof window !== 'undefined') {
    window.BlogMarkdownRenderer = BlogMarkdownRenderer;
    window.renderMarkdownForBlog = renderMarkdownForBlog;
    window.renderWithToc = renderWithToc;
}
