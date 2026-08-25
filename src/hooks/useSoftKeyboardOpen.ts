"use client";

import { useEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/viewport/is-standalone-pwa";

const KEYBOARD_HEIGHT_THRESHOLD = 120;
const KEYBOARD_DOCK_GAP_PX = 10;
/** iOS QuickType / Done toolbar above keyboard keys — not always in visualViewport inset. */
const IOS_KEYBOARD_ACCESSORY_PX = 44;
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";
const STANDALONE_TRACK_MS = 600;

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

type ViewportSnapshot = {
  height: number;
  offsetTop: number;
  innerHeight: number;
};

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

function snapshotViewport(viewport: VisualViewport): ViewportSnapshot {
  return {
    height: viewport.height,
    offsetTop: viewport.offsetTop,
    innerHeight: window.innerHeight,
  };
}

/**
 * Safari tab: layout viewport stays full-height; keyboard shrinks visual viewport.
 * Standalone PWA: height may not shrink — iOS pans offsetTop or scrolls the document.
 * Use max of independent signals; never sum sources (avoids double-count gaps).
 */
function computeRawKeyboardInset(
  viewport: VisualViewport,
  standalone: boolean,
  restViewport: ViewportSnapshot | null
): number {
  const vvInset = Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop
  );

  if (!standalone) {
    return vvInset;
  }

  const scrollInset = Math.max(0, window.scrollY);

  if (restViewport) {
    const restBottom = restViewport.offsetTop + restViewport.height;
    const currentBottom = viewport.offsetTop + viewport.height;
    const visibleShrink = Math.max(0, restBottom - currentBottom);
    const offsetPan = Math.max(
      0,
      viewport.offsetTop - restViewport.offsetTop
    );
    const heightShrink = Math.max(0, restViewport.height - viewport.height);

    return Math.max(
      vvInset,
      scrollInset,
      visibleShrink,
      offsetPan,
      heightShrink
    );
  }

  const offsetInset = Math.max(0, viewport.offsetTop);
  return Math.max(vvInset, scrollInset, offsetInset);
}

export type SoftKeyboardState = {
  /** True once viewport confirms keyboard (may defer on iOS PWA until pointerup). */
  keyboardOpen: boolean;
  /** True immediately when a text field is focused on touch — drives nav/mic hide. */
  composerActive: boolean;
};

export function useSoftKeyboardOpen(): SoftKeyboardState {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [composerActive, setComposerActive] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let restViewport: ViewportSnapshot | null = snapshotViewport(viewport);
    let trackRafId = 0;
    let trackUntil = 0;
    let deferredOpenPending = false;

    const syncRestViewport = () => {
      if (!isEditableField(document.activeElement)) {
        restViewport = snapshotViewport(viewport);
      }
    };

    const setComposerScrollLock = (active: boolean) => {
      document.documentElement.classList.toggle(
        "keyboard-composer-active",
        active
      );
    };

    const stopTracking = () => {
      if (trackRafId) {
        cancelAnimationFrame(trackRafId);
        trackRafId = 0;
      }
      trackUntil = 0;
    };

    const syncViewportMetrics = () => {
      const standalone = isStandalonePwa();
      const focusInField = isEditableField(document.activeElement);
      const rawInset = computeRawKeyboardInset(
        viewport,
        standalone,
        restViewport
      );
      const vvShrunk =
        window.innerHeight - viewport.height - viewport.offsetTop > 60;
      const keyboardVisible =
        rawInset > 60 || (focusInField && isTouchLikeDevice());
      const dockLift =
        (keyboardVisible ? KEYBOARD_DOCK_GAP_PX : 0) +
        (keyboardVisible && isIOS() && vvShrunk
          ? IOS_KEYBOARD_ACCESSORY_PX
          : 0);
      const inset = rawInset + dockLift;

      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`
      );

      if (standalone) {
        setComposerScrollLock(focusInField);
      }
    };

    const settleViewportMetrics = () => {
      syncViewportMetrics();
      requestAnimationFrame(() => {
        syncViewportMetrics();
        requestAnimationFrame(syncViewportMetrics);
      });
    };

    const trackViewportDuringKeyboard = () => {
      stopTracking();
      trackUntil = performance.now() + STANDALONE_TRACK_MS;

      const tick = () => {
        syncViewportMetrics();
        if (performance.now() < trackUntil) {
          trackRafId = requestAnimationFrame(tick);
          return;
        }
        trackRafId = 0;
      };

      trackRafId = requestAnimationFrame(tick);
    };

    const activateKeyboardOpen = () => {
      deferredOpenPending = false;
      setKeyboardOpen(true);
      settleViewportMetrics();
      if (isStandalonePwa()) {
        trackViewportDuringKeyboard();
      }
    };

    const scheduleKeyboardOpen = () => {
      deferredOpenPending = true;
      window.addEventListener("pointerup", activateKeyboardOpen, {
        once: true,
        capture: true,
      });
      window.addEventListener("touchend", activateKeyboardOpen, {
        once: true,
        capture: true,
      });
    };

    const cancelDeferredKeyboardOpen = () => {
      if (!deferredOpenPending) return;
      deferredOpenPending = false;
      window.removeEventListener("pointerup", activateKeyboardOpen, true);
      window.removeEventListener("touchend", activateKeyboardOpen, true);
    };

    const openKeyboardForFocus = () => {
      settleViewportMetrics();

      if (isStandalonePwa() && isTouchLikeDevice()) {
        scheduleKeyboardOpen();
        trackViewportDuringKeyboard();
        return;
      }

      setKeyboardOpen(true);
      settleViewportMetrics();
    };

    const update = () => {
      syncViewportMetrics();

      const focusInField = isEditableField(document.activeElement);
      const heightDelta =
        window.innerHeight - viewport.height - viewport.offsetTop;
      const viewportShrunk = heightDelta > KEYBOARD_HEIGHT_THRESHOLD;
      const touchDevice = isTouchLikeDevice();

      if (touchDevice && focusInField) {
        setComposerActive(true);
        if (!deferredOpenPending) {
          if (isStandalonePwa()) {
            scheduleKeyboardOpen();
          } else {
            setKeyboardOpen(true);
          }
        }
        return;
      }

      setKeyboardOpen(
        viewportShrunk || (focusInField && heightDelta > 60)
      );
    };

    const resetAfterKeyboardDismiss = () => {
      cancelDeferredKeyboardOpen();
      stopTracking();

      if (isStandalonePwa() && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }

      document.documentElement.style.setProperty("--keyboard-inset", "0px");
      setComposerScrollLock(false);
      setComposerActive(false);
      setKeyboardOpen(false);
      syncRestViewport();
      syncViewportMetrics();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        isEditableField(event.target as Element) &&
        isTouchLikeDevice()
      ) {
        setComposerActive(true);
        openKeyboardForFocus();
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
      syncRestViewport();
      update();
    };

    const handleOrientationChange = () => {
      window.setTimeout(() => {
        syncRestViewport();
        update();
      }, 250);
    };

    const handleScroll = () => {
      if (!isStandalonePwa()) return;
      syncViewportMetrics();
      update();
    };

    const handleAppResume = () => {
      if (document.visibilityState !== "visible") return;
      syncRestViewport();
      settleViewportMetrics();
      update();
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    viewport.addEventListener("geometrychange", update);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pageshow", handleAppResume);
    document.addEventListener("visibilitychange", handleAppResume);

    update();

    return () => {
      stopTracking();
      cancelDeferredKeyboardOpen();
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      viewport.removeEventListener("geometrychange", update);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pageshow", handleAppResume);
      document.removeEventListener("visibilitychange", handleAppResume);
      document.documentElement.style.removeProperty("--keyboard-inset");
      setComposerScrollLock(false);
    };
  }, []);

  return { keyboardOpen, composerActive };
}
