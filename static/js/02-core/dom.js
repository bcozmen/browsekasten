
// 02-core/dom.js
// DOM helpers, selectors, and manipulation utilities.
// Example: export function $(selector) { return document.querySelector(selector); }

import { setThemeColorMeta } from './theme-color.js';

// Set data-theme attribute on <html> based on system color scheme
function applySystemTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  setThemeColorMeta();
}

window.addEventListener('DOMContentLoaded', applySystemTheme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);
