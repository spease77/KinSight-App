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
export const VIEWPORT_REAL_STORAGE_KEY = "kinsight-viewport-real";
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
  fixedHeight: number;
  unitHeight: number;
  /** True screen height in CSS px when the layout viewport is short, else 0. */
  realHeight: number;
  scrollY: number;
  visualTop: number;
  extra: number;
};

function probeHeight(css: string): number {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = `position:fixed;left:0;width:1px;${css};visibility:hidden;pointer-events:none;`;
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return Number.isFinite(height) ? height : 0;
}

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

  // What `position: fixed; bottom: N` is measured against.
  const fixedHeight = Math.round(probeHeight("top:0;bottom:0"));
  // Other height units can report the true screen when % and fixed do not.
  const unitHeight = Math.round(
    Math.max(
      probeHeight("height:100dvh"),
      probeHeight("height:100lvh"),
      probeHeight("height:100vh")
    )
  );
  // Do not use screen.height: with iOS Display Zoom it reports the unzoomed
  // device size (e.g. 874) while the app's CSS screen is 760 tall.
  const realHeight = Math.max(unitHeight, innerHeight);
  const raw = realHeight - fixedHeight;

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
    fixedHeight,
    unitHeight,
    realHeight: extra > 0 ? realHeight : 0,
    scrollY: Math.round(window.scrollY),
    visualTop: Math.round(window.visualViewport?.offsetTop ?? 0),
    extra,
  };
}

export function formatViewportMetrics(metrics: ViewportMetrics): string {
  return [
    metrics.standalone ? "home-screen app" : "browser tab",
    `window ${metrics.innerWidth}x${metrics.innerHeight}`,
    `visual h ${metrics.visualHeight}`,
    `fixed h ${metrics.fixedHeight}`,
    `dvh/vh ${metrics.unitHeight}`,
    `screen ${metrics.screenWidth}x${metrics.screenHeight}`,
    `inset top ${metrics.insetTop} / bottom ${metrics.insetBottom}`,
    `extra ${metrics.extra}`,
    `real ${metrics.realHeight}`,
    `scrollY ${metrics.scrollY} / vvTop ${metrics.visualTop}`,
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
    var storedReal = parseInt(localStorage.getItem(${JSON.stringify(
      VIEWPORT_REAL_STORAGE_KEY
    )}), 10);
    if (standalone && stored >= ${MIN_EXTRA_PX} && stored <= ${MAX_EXTRA_PX}) {
      document.documentElement.style.setProperty("--kin-extra", stored + "px");
      if (storedReal > 300) {
        document.documentElement.style.setProperty("--kin-real-h", storedReal + "px");
      }
    }
  } catch (viewportInitErr) {}
})();`;
