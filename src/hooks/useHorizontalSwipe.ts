"use client";

import { useCallback, useRef, type TouchEvent } from "react";

const MIN_DISTANCE_PX = 56;
const HORIZONTAL_BIAS = 1.6;
const MAX_DURATION_MS = 700;

interface UseHorizontalSwipeOptions {
  /** Finger moved right-to-left: go forward in time. */
  onSwipeLeft: () => void;
  /** Finger moved left-to-right: go back in time. */
  onSwipeRight: () => void;
}

/**
 * One step per deliberate horizontal swipe. Vertical scrolling that drifts
 * sideways never triggers it: the move must be mostly horizontal and quick.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeOptions) {
  const startRef = useRef<{ x: number; y: number; at: number } | null>(null);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length !== 1) {
      startRef.current = null;
      return;
    }
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, at: Date.now() };
  }, []);

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const onTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (Date.now() - start.at > MAX_DURATION_MS) return;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_BIAS) return;

      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    [onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
