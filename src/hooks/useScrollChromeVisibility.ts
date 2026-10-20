"use client";

import { useEffect } from "react";

const CHROME_HIDDEN_CLASS = "scroll-chrome-hidden";
const NAV_HIDDEN_CLASS = "scroll-nav-hidden";

/** Headers and the tab bar stay visible. Hiding them on scroll made iOS bounce the nav. */
export function useScrollChromeVisibility() {
  useEffect(() => {
    document.documentElement.classList.remove(
      CHROME_HIDDEN_CLASS,
      NAV_HIDDEN_CLASS
    );
  }, []);
}
