// 02-core/theme-color.js
// Updates the browser UI theme color meta tag to match the CSS variable --primary-900 (supports dark mode)

export function setThemeColorMeta() {
  const meta = document.getElementById('theme-color-meta');
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--primary-900').trim();
  if (meta && color) meta.setAttribute('content', color);
}


// Only export the function. Event listeners are handled in dom.js for consistency.
