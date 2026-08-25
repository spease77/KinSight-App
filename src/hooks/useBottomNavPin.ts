"use client";

import { useEffect } from "react";

/** Keep fixed bottom nav aligned to the visible screen bottom on iOS. */
export function useBottomNavPin() {
  useEffect(() => {
    const viewport = window.visualViewport;

    const sync = () => {
      if (!viewport) {
        document.documentElement.style.setProperty("--bottom-nav-pin", "0px");
        return;
      }

      const pin = Math.max(
        0,
        window.innerHeight - viewport.offsetTop - viewport.height
      );
      document.documentElement.style.setProperty("--bottom-nav-pin", `${pin}px`);
    };

    if (!viewport) {
      sync();
      return;
    }

    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    sync();

    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.documentElement.style.removeProperty("--bottom-nav-pin");
    };
  }, []);
}
