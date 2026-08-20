/** Inline script: sync physical viewport height for iOS Home Screen / standalone PWAs. */
export const standaloneViewportScript = `(() => {
  var maxStableHeight = 0;
  var KEYBOARD_SHRINK_THRESHOLD = 120;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    );
  }

  function getLayoutHeight() {
    var inner = window.innerHeight;
    var vv = window.visualViewport;
    if (!vv) return inner;
    return Math.max(inner, vv.height + vv.offsetTop);
  }

  function isKeyboardLikelyOpen() {
    if (maxStableHeight === 0) return false;
    return maxStableHeight - getLayoutHeight() > KEYBOARD_SHRINK_THRESHOLD;
  }

  function syncAppHeight() {
    if (!isStandalone()) return;

    document.documentElement.dataset.standalone = "true";

    var layoutHeight = getLayoutHeight();

    if (!isKeyboardLikelyOpen()) {
      maxStableHeight = Math.max(maxStableHeight, layoutHeight);
    }

    var appHeight = Math.max(maxStableHeight, layoutHeight);

    document.documentElement.style.setProperty("--app-height", appHeight + "px");
  }

  function scheduleSync() {
    window.requestAnimationFrame(syncAppHeight);
  }

  function scheduleDelayedSync() {
    window.setTimeout(syncAppHeight, 100);
    window.setTimeout(syncAppHeight, 350);
  }

  function resetStableHeight() {
    maxStableHeight = 0;
    scheduleDelayedSync();
  }

  syncAppHeight();
  window.__kinsightSyncStandaloneViewport = syncAppHeight;

  window.addEventListener("resize", scheduleSync);
  window.addEventListener("orientationchange", resetStableHeight);
  window.addEventListener("pageshow", scheduleSync);
  window.addEventListener("focusin", scheduleSync);
  window.addEventListener("focusout", scheduleDelayedSync);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) scheduleDelayedSync();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleSync);
    window.visualViewport.addEventListener("scroll", scheduleSync);
  }
})();`;
