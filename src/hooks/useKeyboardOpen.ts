"use client";

import { useEffect, useState } from "react";

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

const LOCKED_SCROLL_CLASSES = [
  "home-scroll-locked",
  "agenda-scroll-locked",
  "edit-contact-scroll-locked",
  "feedback-scroll-locked",
];

/** Ordinary scrolling pages (Log, Contacts, ...), as opposed to the locked sheets. */
function isFreeScrollPage(): boolean {
  const scrollEl = getAppScroll();
  if (!scrollEl) return false;
  return !LOCKED_SCROLL_CLASSES.some((name) => scrollEl.classList.contains(name));
}

/** Gap (px) kept between a revealed field and the top of the keyboard. */
const KEYBOARD_FIELD_MARGIN_PX = 12;

/** Space the keyboard takes from the bottom of the app frame (gives the page scroll room). */
function syncKeyboardInset(viewport: VisualViewport) {
  const frame = document.getElementById("app-frame");
  const frameBottom = frame
    ? frame.getBoundingClientRect().bottom
    : window.innerHeight;
  const visualBottom = viewport.offsetTop + viewport.height;
  const inset = Math.max(0, Math.round(frameBottom - visualBottom));
  document.documentElement.style.setProperty("--kb-inset", `${inset}px`);
}

/**
 * Scroll the page so a focused field sits just above the keyboard instead of
 * behind it. Only for ordinary scrolling pages; locked sheets manage themselves.
 */
function revealFieldAboveKeyboard(viewport: VisualViewport) {
  if (!isFreeScrollPage()) return;

  const field = document.activeElement;
  if (!isEditableField(field)) return;

  syncKeyboardInset(viewport);

  const scrollEl = getAppScroll();
  if (!scrollEl) return;

  const visualBottom = viewport.offsetTop + viewport.height;
  const overflow =
    (field as HTMLElement).getBoundingClientRect().bottom -
    (visualBottom - KEYBOARD_FIELD_MARGIN_PX);

  if (overflow > 1) {
    scrollEl.scrollTop += overflow;
  }
}

function isHomeConversationActive(): boolean {
  return Boolean(document.querySelector(".home-dashboard--conversation"));
}

function isHomeStateA(): boolean {
  return Boolean(document.querySelector(".home-dashboard--state-a"));
}

/** Keep keyboard-closed Home composer at the same height as when the keyboard is open. */
function persistHomeStateAComposerPin(viewport: VisualViewport) {
  if (!isHomeStateA()) return;
  if (!document.documentElement.classList.contains("keyboard-composer-active")) {
    return;
  }

  // Measure from the real (top-anchored) app frame, not the layout viewport,
  // whose bottom edge is unreliable in iOS Home Screen apps. The resting
  // composer is placed with `top: frame height - this value`.
  const dock = document.querySelector<HTMLElement>(".home-composer-dock");
  const frame = document.getElementById("app-frame");
  if (!dock || !frame) return;

  const frameHeight = frame.getBoundingClientRect().height;
  const dockBottom = dock.getBoundingClientRect().bottom;
  const gap = frameHeight - dockBottom;

  // Ignore bogus readings; a real iOS keyboard sits 200px+ up the screen.
  if (gap < 120 || gap > frameHeight * 0.7 || viewport.height <= 0) return;

  document.documentElement.style.setProperty(
    "--home-state-a-composer-pinned-bottom",
    `${Math.round(gap)}px`
  );
}

/** Pin composer bottom edge to the visual viewport bottom (flush above keyboard). */
function syncVisualViewportGeometry(viewport: VisualViewport) {
  let gapFromLayoutBottom = Math.max(
    0,
    window.innerHeight - viewport.offsetTop - viewport.height
  );

  const dock = document.querySelector<HTMLElement>(".home-composer-dock");
  if (
    dock &&
    document.documentElement.classList.contains("keyboard-composer-active")
  ) {
    const visualBottom = viewport.offsetTop + viewport.height;
    const floatAbove = visualBottom - dock.getBoundingClientRect().bottom;
    if (floatAbove > 0.5) {
      gapFromLayoutBottom = Math.max(0, gapFromLayoutBottom - floatAbove);
    }
  }

  document.documentElement.style.setProperty(
    "--vv-layout-bottom-gap",
    `${gapFromLayoutBottom}px`
  );

  persistHomeStateAComposerPin(viewport);
}

function scheduleVisualViewportSync(viewport: VisualViewport) {
  syncVisualViewportGeometry(viewport);
  requestAnimationFrame(() => {
    syncVisualViewportGeometry(viewport);
    requestAnimationFrame(() => syncVisualViewportGeometry(viewport));
  });
}

function clearVisualViewportGeometry() {
  document.documentElement.style.removeProperty("--vv-layout-bottom-gap");
  document.documentElement.style.removeProperty("--kb-inset");
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
        scheduleVisualViewportSync(viewport);
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
        if (isFreeScrollPage()) {
          // Pages such as Log: keep the scroll position and lift the tapped
          // field above the keyboard once it has finished animating in.
          [0, 120, 300, 550].forEach((delay) =>
            window.setTimeout(() => revealFieldAboveKeyboard(viewport), delay)
          );
        } else if (!isHomeConversationActive() && !isHomeStateA()) {
          lockPageScroll();
        }
        scheduleVisualViewportSync(viewport);
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

    const handleViewportResize = () => {
      update();
      revealFieldAboveKeyboard(viewport);
    };

    viewport.addEventListener("resize", handleViewportResize);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", update);

    update();

    return () => {
      viewport.removeEventListener("resize", handleViewportResize);
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
