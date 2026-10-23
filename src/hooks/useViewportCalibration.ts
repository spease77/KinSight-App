"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  VIEWPORT_EXTRA_STORAGE_KEY,
  VIEWPORT_REAL_STORAGE_KEY,
  formatViewportMetrics,
  readViewportMetrics,
} from "@/lib/viewport-calibration";

const RETRY_DELAYS_MS = [0, 60, 150, 400, 800, 1500, 3000];
const POLL_MS = 500;

/**
 * iOS Home Screen apps can have a layout viewport that is shorter than the
 * real screen, and that shortfall can change after load and between routes.
 *
 * Publishes:
 * - `--kin-real-h`: true screen height in px (only when the viewport is short).
 *   The frame and tab bar are anchored from the TOP with this value, so they
 *   do not depend on the unstable bottom edge.
 * - `--kin-extra`: current shortfall, used by bottom-anchored fixed docks.
 */
export function useViewportCalibration() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      // The keyboard changes viewport geometry; keep the last good values.
      if (root.classList.contains("keyboard-composer-active")) return;
      if (document.visibilityState === "hidden") return;

      const metrics = readViewportMetrics();
      root.style.setProperty("--kin-extra", `${metrics.extra}px`);
      if (metrics.realHeight > 0) {
        root.style.setProperty("--kin-real-h", `${metrics.realHeight}px`);
      } else {
        root.style.removeProperty("--kin-real-h");
      }
      root.dataset.kinMetrics = formatViewportMetrics(metrics);

      try {
        if (metrics.extra > 0) {
          window.localStorage.setItem(
            VIEWPORT_EXTRA_STORAGE_KEY,
            String(metrics.extra)
          );
          window.localStorage.setItem(
            VIEWPORT_REAL_STORAGE_KEY,
            String(metrics.realHeight)
          );
        } else {
          window.localStorage.removeItem(VIEWPORT_EXTRA_STORAGE_KEY);
          window.localStorage.removeItem(VIEWPORT_REAL_STORAGE_KEY);
        }
      } catch {
        // Storage can be unavailable; the live values still apply.
      }
    };

    const timers = RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(apply, delay)
    );
    // The shortfall can change after load and on navigation; keep tracking it.
    const poll = window.setInterval(apply, POLL_MS);

    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("pageshow", apply);
    document.addEventListener("visibilitychange", apply);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(poll);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("pageshow", apply);
      document.removeEventListener("visibilitychange", apply);
    };
    // Re-run on route change so a viewport shift during navigation is corrected.
  }, [pathname]);
}
