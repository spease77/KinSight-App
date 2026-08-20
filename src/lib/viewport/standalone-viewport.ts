/** Inline script: sync physical viewport height for iOS Home Screen / standalone PWAs. */
export const standaloneViewportScript = `(() => {
  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    );
  }

  function syncAppHeight() {
    if (!isStandalone()) return;

    document.documentElement.dataset.standalone = "true";
    document.documentElement.style.setProperty(
      "--app-height",
      window.innerHeight + "px"
    );
  }

  syncAppHeight();
  window.addEventListener("resize", syncAppHeight);
  window.addEventListener("orientationchange", function () {
    window.setTimeout(syncAppHeight, 100);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncAppHeight);
  }
})();`;
