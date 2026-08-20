"use client";

import { useEffect } from "react";

/** Prevents app-scroll from shifting when the feedback textarea is focused. */
export function useFeedbackScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    scrollEl.classList.add("feedback-scroll-locked");

    const lockScroll = () => {
      scrollEl.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    lockScroll();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", lockScroll);
    viewport?.addEventListener("scroll", lockScroll);

    return () => {
      scrollEl.classList.remove("feedback-scroll-locked");
      viewport?.removeEventListener("resize", lockScroll);
      viewport?.removeEventListener("scroll", lockScroll);
    };
  }, [active]);
}
