"use client";

import { useEffect, useState } from "react";

const KEYBOARD_INSET_THRESHOLD = 50;
const COMPOSER_KEYBOARD_GAP_PX = 8;
/** Fallback when iOS overlays keyboard without shrinking visualViewport. */
const IOS_KEYBOARD_FALLBACK_PX = 260;
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

function getAppScroll(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".app-scroll");
}

/** Prevent scroll drift from repeated focus / visualViewport events. */
function resetAppScroll() {
  const scrollEl = getAppScroll();
  if (scrollEl) {
    scrollEl.scrollTop = 0;
  }
}

function syncKeyboardInset(insetPx: number) {
  document.documentElement.style.setProperty(
    "--keyboard-inset",
    `${Math.max(0, insetPx)}px`
  );
}

function lockPageScroll() {
  resetAppScroll();
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function resolveComposerBottomInset(
  viewport: VisualViewport,
  composerActive: boolean
): number {
  if (!composerActive) return 0;

  const visualBottomGap = Math.max(
    0,
    window.innerHeight - viewport.offsetTop - viewport.height
  );

  if (visualBottomGap >= KEYBOARD_INSET_THRESHOLD) {
    return visualBottomGap + COMPOSER_KEYBOARD_GAP_PX;
  }

  const panInset = Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop
  );

  if (panInset >= KEYBOARD_INSET_THRESHOLD) {
    return panInset + COMPOSER_KEYBOARD_GAP_PX;
  }

  if (viewport.offsetTop >= KEYBOARD_INSET_THRESHOLD) {
    return viewport.offsetTop + COMPOSER_KEYBOARD_GAP_PX;
  }

  return IOS_KEYBOARD_FALLBACK_PX + COMPOSER_KEYBOARD_GAP_PX;
}

function isHomeConversationActive(): boolean {
  return Boolean(
    document.querySelector(".home-dashboard--conversation")
  );
}

/** Sync DOM class for instant nav/mic hide before React re-render. */
function setComposerActiveClass(active: boolean) {
  document.documentElement.classList.toggle("keyboard-composer-active", active);
  if (!active) {
    syncKeyboardInset(0);
  }
}

export type KeyboardChromeState = {
  isKeyboardOpen: boolean;
  composerActive: boolean;
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
      const touch = isTouchLikeDevice();
      const active = touch && focusInField;
      const inset = computeKeyboardInset(viewport);
      const viewportShrunk = inset > KEYBOARD_INSET_THRESHOLD;

      if (active) {
        syncKeyboardInset(resolveComposerBottomInset(viewport, true));
        setComposerActiveClass(true);
        setComposerActive(true);
        setIsKeyboardOpen(viewportShrunk || true);
        return;
      }

      setComposerActiveClass(false);
      setComposerActive(false);
      setIsKeyboardOpen(viewportShrunk);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableField(event.target as Element) && isTouchLikeDevice()) {
        if (!isHomeConversationActive()) {
          lockPageScroll();
        }
        syncKeyboardInset(
          resolveComposerBottomInset(viewport, true)
        );
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
      syncKeyboardInset(0);
    };
  }, []);

  return {
    isKeyboardOpen,
    composerActive,
    shouldHideChrome: composerActive,
  };
}
