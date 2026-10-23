/**
 * iOS Home Screen web apps can report a layout viewport (window.innerHeight)
 * that ends tens of pixels above the physical bottom of the screen. Every
 * `position: fixed; bottom: N` element, `height: 100%` shell, and `dvh` unit
 * then stops short of the glass, leaving an unused band under the app.
 *
 * We measure that difference once per layout change and expose it as
 * `--kin-extra`. The app frame grows down by that amount and the tab bar /
 * composer dock subtract it from their `bottom` offsets, so everything is
 * placed relative to the real screen edge instead of the short viewport.
 */

export const VIEWPORT_EXTRA_STORAGE_KEY = "kinsight-viewport-extra";
export const MIN_EXTRA_PX = 8;
export const MAX_EXTRA_PX = 90;
const MAX_PHONE_SHORT_SIDE_PX = 520;

export type ViewportMetrics = {
  standalone: boolean;
  portrait: boolean;
  innerWidth: number;
  innerHeight: number;
  visualHeight: number;
  screenWidth: number;
  screenHeight: number;
  insetTop: number;
  insetBottom: number;
  extra: number;
};

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function readInset(side: "top" | "bottom"): number {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    `padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const value = parseFloat(side === "top" ? style.paddingTop : style.paddingBottom);
  probe.remove();
  return Number.isFinite(value) ? value : 0;
}

export function readViewportMetrics(): ViewportMetrics {
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const longSide = Math.max(window.screen.width, window.screen.height);
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const screenWidth = portrait ? shortSide : longSide;
  const screenHeight = portrait ? longSide : shortSide;
  const innerHeight = window.innerHeight;
  const standalone = isStandalone();
  const raw = screenHeight - innerHeight;

  const extra =
    standalone &&
    portrait &&
    shortSide <= MAX_PHONE_SHORT_SIDE_PX &&
    raw >= MIN_EXTRA_PX &&
    raw <= MAX_EXTRA_PX
      ? Math.round(raw)
      : 0;

  return {
    standalone,
    portrait,
    innerWidth: window.innerWidth,
    innerHeight,
    visualHeight: Math.round(window.visualViewport?.height ?? innerHeight),
    screenWidth,
    screenHeight,
    insetTop: Math.round(readInset("top")),
    insetBottom: Math.round(readInset("bottom")),
    extra,
  };
}

export function formatViewportMetrics(metrics: ViewportMetrics): string {
  return [
    metrics.standalone ? "home-screen app" : "browser tab",
    `window ${metrics.innerWidth}x${metrics.innerHeight}`,
    `visual h ${metrics.visualHeight}`,
    `screen ${metrics.screenWidth}x${metrics.screenHeight}`,
    `inset top ${metrics.insetTop} / bottom ${metrics.insetBottom}`,
    `extra ${metrics.extra}`,
  ].join(" · ");
}

/** Runs before first paint so the frame does not jump after hydration. */
export const viewportInitScript = `(() => {
  try {
    var standalone = window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    var stored = parseInt(localStorage.getItem(${JSON.stringify(
      VIEWPORT_EXTRA_STORAGE_KEY
    )}), 10);
    if (standalone && stored >= ${MIN_EXTRA_PX} && stored <= ${MAX_EXTRA_PX}) {
      document.documentElement.style.setProperty("--kin-extra", stored + "px");
    }
  } catch (viewportInitErr) {}
})();`;
