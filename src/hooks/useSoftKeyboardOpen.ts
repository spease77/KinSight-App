"use client";

import { useEffect, useRef, useState } from "react";

const KEYBOARD_HEIGHT_THRESHOLD = 120;
const KEYBOARD_DOCK_GAP_PX = 10;
/** iOS QuickType / Done toolbar above keyboard keys — not always in visualViewport inset. */
const IOS_KEYBOARD_ACCESSORY_PX = 44;
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

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useSoftKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const baselineHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const syncBaseline = () => {
      if (!isEditableField(document.activeElement)) {
        baselineHeightRef.current = Math.max(
          window.innerHeight,
          viewport.height
        );
      }
    };

    const syncViewportMetrics = () => {
      const rawInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      const keyboardVisible = rawInset > 60;
      const dockLift =
        (keyboardVisible ? KEYBOARD_DOCK_GAP_PX : 0) +
        (keyboardVisible && isIOS() ? IOS_KEYBOARD_ACCESSORY_PX : 0);
      const inset = rawInset + dockLift;

      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`
      );
      document.documentElement.style.setProperty(
        "--visual-viewport-offset-top",
        `${Math.max(0, viewport.offsetTop)}px`
      );
    };

    const settleViewportMetrics = () => {
      syncViewportMetrics();
      requestAnimationFrame(() => {
        syncViewportMetrics();
        requestAnimationFrame(syncViewportMetrics);
      });
    };

    const update = () => {
      syncViewportMetrics();

      const focusInField = isEditableField(document.activeElement);
      const baseline = baselineHeightRef.current ?? viewport.height;
      const heightDelta = baseline - viewport.height;
      const viewportShrunk = heightDelta > KEYBOARD_HEIGHT_THRESHOLD;
      const touchDevice = isTouchLikeDevice();

      if (touchDevice && focusInField) {
        setKeyboardOpen(true);
        return;
      }

      setKeyboardOpen(
        viewportShrunk || (focusInField && heightDelta > 60)
      );
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        isEditableField(event.target as Element) &&
        isTouchLikeDevice()
      ) {
        setKeyboardOpen(true);
        settleViewportMetrics();
        return;
      }

      update();
    };

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (!isEditableField(document.activeElement)) {
          syncBaseline();
          setKeyboardOpen(false);
          return;
        }

        update();
      }, 100);
    };

    const handleResize = () => {
      syncBaseline();
      update();
    };

    const handleOrientationChange = () => {
      window.setTimeout(() => {
        syncBaseline();
        update();
      }, 250);
    };

    baselineHeightRef.current = Math.max(window.innerHeight, viewport.height);

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.documentElement.style.removeProperty("--keyboard-inset");
      document.documentElement.style.removeProperty(
        "--visual-viewport-offset-top"
      );
    };
  }, []);

  return keyboardOpen;
}
