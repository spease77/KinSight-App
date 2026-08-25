"use client";

import { useEffect, useState } from "react";

const COMPOSER_KEYBOARD_GAP_PX = 4;
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

function getAppScroll(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".app-scroll");
}

function resetAppScroll() {
  const scrollEl = getAppScroll();
  if (scrollEl) {
    scrollEl.scrollTop = 0;
  }
}

function lockPageScroll() {
  resetAppScroll();
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function isHomeConversationActive(): boolean {
  return Boolean(document.querySelector(".home-dashboard--conversation"));
}

/** Pin composer to the visual viewport bottom edge (flush above keyboard). */
function syncVisualViewportGeometry(viewport: VisualViewport) {
  const bottomEdge = viewport.offsetTop + viewport.height;
  document.documentElement.style.setProperty(
    "--vv-bottom-edge",
    `${bottomEdge}px`
  );
  document.documentElement.style.setProperty(
    "--vv-offset-top",
    `${viewport.offsetTop}px`
  );
  document.documentElement.style.setProperty(
    "--vv-height",
    `${viewport.height}px`
  );
  document.documentElement.style.setProperty(
    "--composer-keyboard-gap",
    `${COMPOSER_KEYBOARD_GAP_PX}px`
  );

  const dock = document.querySelector<HTMLElement>(".home-composer-dock");
  if (dock) {
    document.documentElement.style.setProperty(
      "--composer-dock-height",
      `${dock.offsetHeight}px`
    );
  }
}

function clearVisualViewportGeometry() {
  document.documentElement.style.removeProperty("--vv-bottom-edge");
  document.documentElement.style.removeProperty("--vv-offset-top");
  document.documentElement.style.removeProperty("--vv-height");
  document.documentElement.style.removeProperty("--composer-dock-height");
}

/** Sync DOM class for instant nav/mic hide before React re-render. */
function setComposerActiveClass(active: boolean) {
  document.documentElement.classList.toggle("keyboard-composer-active", active);
  if (!active) {
    clearVisualViewportGeometry();
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

      if (active) {
        syncVisualViewportGeometry(viewport);
        setComposerActiveClass(true);
        setComposerActive(true);
        setIsKeyboardOpen(true);
        return;
      }

      setComposerActiveClass(false);
      setComposerActive(false);
      setIsKeyboardOpen(false);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableField(event.target as Element) && isTouchLikeDevice()) {
        if (!isHomeConversationActive()) {
          lockPageScroll();
        }
        syncVisualViewportGeometry(viewport);
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
      clearVisualViewportGeometry();
    };
  }, []);

  return {
    isKeyboardOpen,
    composerActive,
    shouldHideChrome: composerActive,
  };
}
