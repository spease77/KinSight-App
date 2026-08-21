"use client";

import { useEffect } from "react";

/**
 * Keeps State A home layout pinned when the ask bar is focused on iOS.
 * Mirrors the Feedback page pattern: in-flow header + zero scroll offset.
 */
export function useHomeKeyboardStable(active: boolean): void {
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
