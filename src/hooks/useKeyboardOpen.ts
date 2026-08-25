"use client";

import { useEffect, useState } from "react";

/** True when the on-screen keyboard is open (visual viewport shrinks). */
export function useKeyboardOpen(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const check = () => {
      setIsKeyboardOpen(viewport.height < window.innerHeight * 0.8);
    };

    check();
    viewport.addEventListener("resize", check);
    viewport.addEventListener("scroll", check);

    return () => {
      viewport.removeEventListener("resize", check);
      viewport.removeEventListener("scroll", check);
    };
  }, []);

  return isKeyboardOpen;
}
