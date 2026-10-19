/** Avoid doubling iOS’s native status bar with env(safe-area-inset-top). */

function readSafeAreaTopPx(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const inset = probe.offsetHeight;
  probe.remove();
  return inset;
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/**
 * Home Screen PWAs with `default` status-bar-style already sit below the clock.
 * Adding env(safe-area-inset-top) on top of that creates the tall empty header.
 * Only apply the inset when the webview extends under the status bar.
 */
export function syncIosStatusInset(): void {
  const inset = readSafeAreaTopPx();
  const standalone = isStandaloneDisplay();
  const lost = window.screen.height - window.innerHeight;
  const overlaying = standalone ? lost < inset + 24 : inset > 0;
  const applied = overlaying ? inset : 0;

  document.documentElement.style.setProperty("--app-sat", `${applied}px`);
  document.documentElement.classList.toggle("ios-status-overlay", applied > 0);
}
