"use client";

import { useEffect, useState } from "react";

const KEYBOARD_INSET_THRESHOLD = 50;
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";

const NON_KEYBOARD_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isEditableField(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) return false;
    return !NON_KEYBOARD_INPUT_TYPES.has(element.type.toLowerCase());
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  if (element instanceof HTMLSelectElement) {
    return !element.disabled;
  }

  return element.isContentEditable;
}

function isTouchLikeDevice(): boolean {
  return (
    window.matchMedia(COARSE_POINTER_QUERY).matches ||
    window.matchMedia(MOBILE_MEDIA_QUERY).matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

function computeKeyboardInset(viewport: VisualViewport): number {
  return Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop
  );
}

/** Sync DOM class for instant nav/mic hide before React re-render. */
function setComposerActiveClass(active: boolean) {
  document.documentElement.classList.toggle("keyboard-composer-active", active);
}

export type KeyboardChromeState = {
  /** True when visual viewport confirms keyboard is open. */
  isKeyboardOpen: boolean;
  /** True immediately when a text field is focused on touch devices. */
  composerActive: boolean;
  /** Combined signal — hide bottom nav and home mic. */
  shouldHideChrome: boolean;
};

export function useKeyboardOpen(): KeyboardChromeState {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [composerActive, setComposerActive] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const focusInField = isEditableField(document.activeElement);
      const inset = computeKeyboardInset(viewport);
      const viewportShrunk = inset > KEYBOARD_INSET_THRESHOLD;
      const touch = isTouchLikeDevice();

      if (touch && focusInField) {
        setComposerActiveClass(true);
        setComposerActive(true);
        setIsKeyboardOpen(viewportShrunk || true);
        return;
      }

      const active = focusInField && touch;
      setComposerActiveClass(active);
      setComposerActive(active);
      setIsKeyboardOpen(viewportShrunk || (focusInField && inset > 30));
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableField(event.target as Element) && isTouchLikeDevice()) {
        setComposerActiveClass(true);
        setComposerActive(true);
        setIsKeyboardOpen(true);
        return;
      }
      update();
    };

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (!isEditableField(document.activeElement)) {
          setComposerActiveClass(false);
          setComposerActive(false);
          setIsKeyboardOpen(false);
          return;
        }
        update();
      }, 100);
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", update);

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", update);
      setComposerActiveClass(false);
    };
  }, []);

  return {
    isKeyboardOpen,
    composerActive,
    shouldHideChrome: isKeyboardOpen || composerActive,
  };
}
