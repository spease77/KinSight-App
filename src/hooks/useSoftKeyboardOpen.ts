"use client";

import { useEffect, useState } from "react";

const KEYBOARD_HEIGHT_THRESHOLD = 140;

function isEditableField(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.isContentEditable
  );
}

export function useSoftKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const heightDelta = window.innerHeight - viewport.height;
      const focusInField = isEditableField(document.activeElement);

      setKeyboardOpen(
        heightDelta > KEYBOARD_HEIGHT_THRESHOLD ||
          (focusInField && heightDelta > 80)
      );
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
    };
  }, []);

  return keyboardOpen;
}
