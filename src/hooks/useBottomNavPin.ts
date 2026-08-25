"use client";

import { useEffect } from "react";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** PWA: flush to physical screen bottom. Browser: optional Safari toolbar offset. */
export function useBottomNavPin() {
  useEffect(() => {
    const viewport = window.visualViewport;

    const sync = () => {
      // Home-screen PWA has no browser chrome — always sit on the glass edge.
      if (isStandalonePwa()) {
        document.documentElement.style.setProperty("--bottom-nav-pin", "0px");
        return;
      }

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
