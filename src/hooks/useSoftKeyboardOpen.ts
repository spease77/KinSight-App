"use client";

import { useEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/viewport/is-standalone-pwa";

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

/**
 * Single keyboard-height formula for Safari tab and standalone PWA.
 * visualViewport shrink is primary; standalone falls back to document scroll
 * when vv.height does not shrink (never sum or double-count sources).
 */
function computeRawKeyboardInset(
  viewport: VisualViewport,
  standalone: boolean
): number {
  const vvInset = Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop
  );

  if (!standalone) {
    return vvInset;
  }

  const scrollInset = Math.max(0, window.scrollY);
  return Math.max(vvInset, scrollInset);
}

export function useSoftKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const syncViewportMetrics = () => {
      const standalone = isStandalonePwa();
      const focusInField = isEditableField(document.activeElement);
      const rawInset = computeRawKeyboardInset(viewport, standalone);
      const keyboardVisible =
        rawInset > 60 || (focusInField && isTouchLikeDevice());
      const dockLift =
        (keyboardVisible ? KEYBOARD_DOCK_GAP_PX : 0) +
        (keyboardVisible && isIOS() ? IOS_KEYBOARD_ACCESSORY_PX : 0);
      const inset = rawInset + dockLift;

      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`
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
      const heightDelta =
        window.innerHeight - viewport.height - viewport.offsetTop;
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

    const resetAfterKeyboardDismiss = () => {
      if (isStandalonePwa() && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
      document.documentElement.style.setProperty("--keyboard-inset", "0px");
      setKeyboardOpen(false);
      syncViewportMetrics();
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
          resetAfterKeyboardDismiss();
          return;
        }

        update();
      }, 100);
    };

    const handleResize = () => {
      update();
    };

    const handleOrientationChange = () => {
      window.setTimeout(update, 250);
    };

    const handleScroll = () => {
      if (!isStandalonePwa()) return;
      syncViewportMetrics();
      update();
    };

    const handleAppResume = () => {
      if (document.visibilityState !== "visible") return;
      settleViewportMetrics();
      update();
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pageshow", handleAppResume);
    document.addEventListener("visibilitychange", handleAppResume);

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pageshow", handleAppResume);
      document.removeEventListener("visibilitychange", handleAppResume);
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return keyboardOpen;
}
