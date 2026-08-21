"use client";

import { useEffect } from "react";

/** Prevents app-scroll from shifting when the home ask bar is focused. */
export function useHomeScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    const lockScroll = () => {
      scrollEl.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    lockScroll();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", lockScroll);
    viewport?.addEventListener("scroll", lockScroll);

    return () => {
      viewport?.removeEventListener("resize", lockScroll);
      viewport?.removeEventListener("scroll", lockScroll);
    };
  }, [active]);
}
