"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AXIS_LOCK_PX = 12;
const MIN_DISTANCE_PX = 48;
const HORIZONTAL_BIAS = 1.35;

interface UseHorizontalSwipeOptions {
  /** Finger moved right-to-left: go forward in time. */
  onSwipeLeft: () => void;
  /** Finger moved left-to-right: go back in time. */
  onSwipeRight: () => void;
  enabled?: boolean;
}

/**
 * One step per deliberate horizontal swipe. Capture-phase listeners beat inner
 * scrollers; once the gesture is locked sideways, vertical scrolling is paused
 * so iOS cannot steal the pan.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseHorizontalSwipeOptions) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"h" | "v" | null>(null);
  const suppressClickRef = useRef(false);
  const leftRef = useRef(onSwipeLeft);
  const rightRef = useRef(onSwipeRight);
  leftRef.current = onSwipeLeft;
  rightRef.current = onSwipeRight;

  const attach = useCallback((next: HTMLElement | null) => {
    setNode(next);
  }, []);

  useEffect(() => {
    if (!node || !enabled) return;

    const reset = () => {
      startRef.current = null;
      axisRef.current = null;
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      const touch = event.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      axisRef.current = null;
    };

    const onMove = (event: TouchEvent) => {
      const start = startRef.current;
      if (!start || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (!axisRef.current) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        axisRef.current =
          Math.abs(dx) > Math.abs(dy) * HORIZONTAL_BIAS ? "h" : "v";
      }

      if (axisRef.current === "h") {
        event.preventDefault();
      }
    };

    const onEnd = (event: TouchEvent) => {
      const start = startRef.current;
      const axis = axisRef.current;
      reset();
      if (!start || axis !== "h") return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);

      if (dx < 0) leftRef.current();
      else rightRef.current();
    };

    const onClickCapture = (event: Event) => {
      if (!suppressClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };

    node.addEventListener("touchstart", onStart, { passive: true, capture: true });
    node.addEventListener("touchmove", onMove, { passive: false, capture: true });
    node.addEventListener("touchend", onEnd, { passive: true, capture: true });
    node.addEventListener("touchcancel", reset, { capture: true });
    node.addEventListener("click", onClickCapture, true);

    return () => {
      node.removeEventListener("touchstart", onStart, true);
      node.removeEventListener("touchmove", onMove, true);
      node.removeEventListener("touchend", onEnd, true);
      node.removeEventListener("touchcancel", reset, true);
      node.removeEventListener("click", onClickCapture, true);
    };
  }, [node, enabled]);

  return attach;
}
