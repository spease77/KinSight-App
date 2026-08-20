"use client";

import { useEffect } from "react";

/** Keeps app-scroll from scrolling so the edit/add contact sheet header stays pinned. */
export function useEditContactScrollLock(): void {
  useEffect(() => {
    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    scrollEl.classList.add("edit-contact-scroll-locked");

    return () => {
      scrollEl.classList.remove("edit-contact-scroll-locked");
    };
  }, []);
}
