/** Inline script: mark iOS Home Screen / standalone PWAs for CSS (100lvh shell). */
export const standaloneViewportScript = `(() => {
  function markStandalone() {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    ) {
      document.documentElement.dataset.standalone = "true";
    }
  }

  markStandalone();
})();`;
