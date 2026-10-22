"use client";

import { useLayoutEffect, type RefObject } from "react";

const ICON_ROW_PX = 52;
const RETRY_MS = [0, 50, 150, 400, 1000];

function visualBottomY(): number {
  const vv = window.visualViewport;
  if (!vv) return window.innerHeight;
  return vv.offsetTop + vv.height;
}

function fixedZeroBottomY(): number {
  const probe = document.createElement("div");
  probe.setAttribute("data-bottom-nav-probe", "1");
  probe.style.cssText =
    "position:fixed;left:0;bottom:0;width:1px;height:1px;margin:0;padding:0;border:0;transform:none;filter:none;contain:none;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const bottom = probe.getBoundingClientRect().bottom;
  probe.remove();
  return bottom;
}

/**
 * iOS Home Screen already parks position:fixed; bottom:0 on the safe edge.
 * env(safe-area-inset-bottom) on the nav then lifts the icons. Pin the 52px
 * icon row to the lowest paintable pixel instead of trusting env().
 */
export function pinBottomNav(nav: HTMLElement) {
  if (document.documentElement.classList.contains("keyboard-composer-active")) {
    return;
  }

  const paintBottom = Math.max(visualBottomY(), fixedZeroBottomY());
  const top = Math.round(paintBottom - ICON_ROW_PX);
  const height = Math.round(
    Math.max(ICON_ROW_PX, window.innerHeight - top)
  );

  nav.style.setProperty("position", "fixed", "important");
  nav.style.setProperty("left", "0px", "important");
  nav.style.setProperty("right", "0px", "important");
  nav.style.setProperty("top", `${top}px`, "important");
  nav.style.setProperty("bottom", "auto", "important");
  nav.style.setProperty("height", `${height}px`, "important");
  nav.style.setProperty("padding", "0px", "important");
  nav.style.setProperty("margin", "0px", "important");
  nav.style.setProperty("transform", "none", "important");
}

export function usePinBottomNav(navRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const run = () => {
      if (navRef.current) pinBottomNav(navRef.current);
    };

    run();
    const timers = RETRY_MS.map((ms) => window.setTimeout(run, ms));
    const vv = window.visualViewport;
    vv?.addEventListener("resize", run);
    vv?.addEventListener("scroll", run);
    window.addEventListener("resize", run);
    window.addEventListener("orientationchange", run);
    window.addEventListener("pageshow", run);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      vv?.removeEventListener("resize", run);
      vv?.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
      window.removeEventListener("orientationchange", run);
      window.removeEventListener("pageshow", run);
    };
  }, [navRef]);
}
