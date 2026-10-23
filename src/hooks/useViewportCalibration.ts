"use client";

import { useEffect } from "react";
import {
  VIEWPORT_EXTRA_STORAGE_KEY,
  formatViewportMetrics,
  readViewportMetrics,
} from "@/lib/viewport-calibration";

const RETRY_DELAYS_MS = [0, 120, 400, 1200, 3000];

/**
 * Publishes `--kin-extra`: how far the real screen extends below the layout
 * viewport on iOS Home Screen apps. Zero in browsers and on correct devices.
 */
export function useViewportCalibration() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      // The keyboard changes viewport geometry; keep the last good value.
      if (root.classList.contains("keyboard-composer-active")) return;

      const metrics = readViewportMetrics();
      root.style.setProperty("--kin-extra", `${metrics.extra}px`);
      root.dataset.kinMetrics = formatViewportMetrics(metrics);

      try {
        if (metrics.extra > 0) {
          window.localStorage.setItem(
            VIEWPORT_EXTRA_STORAGE_KEY,
            String(metrics.extra)
          );
        } else {
          window.localStorage.removeItem(VIEWPORT_EXTRA_STORAGE_KEY);
        }
      } catch {
        // Storage can be unavailable; the live value still applies.
      }
    };

    const timers = RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(apply, delay)
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };

    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("pageshow", apply);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("pageshow", apply);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
