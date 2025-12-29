// Minimal JavaScript for progressive enhancement
// All functionality should work without JavaScript

(function() {
  'use strict';

  // Add external link indicators
  function markExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
      const url = new URL(link.href);
      if (url.hostname !== window.location.hostname) {
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('target', '_blank');
      }
    });
  }

  // Add copy button to code blocks
  function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.textContent = 'Copy';
      button.style.cssText = 'position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem; background: var(--accent-color); color: white; border: none; border-radius: 3px; cursor: pointer;';

      const pre = block.parentElement;
      pre.style.position = 'relative';

      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(block.textContent);
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });

      pre.appendChild(button);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      markExternalLinks();
      if (navigator.clipboard) {
        addCopyButtons();
      }
    });
  } else {
    markExternalLinks();
    if (navigator.clipboard) {
      addCopyButtons();
    }
  }
})();
