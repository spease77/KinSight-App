"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHROME_HIDDEN_CLASS = "scroll-chrome-hidden";
const NAV_HIDDEN_CLASS = "scroll-nav-hidden";

/** Pixels of movement in one direction before the tab bar reacts. */
const DIRECTION_THRESHOLD_PX = 10;
/** Within this distance of the top of a scroller the tab bar is always shown. */
const TOP_ZONE_PX = 24;

/**
 * Tab bar only: swipe up (content scrolls down) hides the floating pill, swipe
 * down (content scrolls back up) shows it. Headers always stay visible.
 *
 * The hide is a pure paint effect (opacity + `translate`, see
 * bottom-nav.module.css); the pill's `top`/position never change, so this
 * cannot disturb the locked bar placement or cause iOS layout shifts.
 */
export function useScrollChromeVisibility() {
  const pathname = usePathname();
  const root = typeof document === "undefined" ? null : document.documentElement;

  // Always show the bar when the route changes.
  useEffect(() => {
    root?.classList.remove(CHROME_HIDDEN_CLASS, NAV_HIDDEN_CLASS);
  }, [pathname, root]);

  useEffect(() => {
    if (!root) {
      return;
    }

    root.classList.remove(CHROME_HIDDEN_CLASS);

    const lastTop = new WeakMap<EventTarget, number>();
    const travel = new WeakMap<EventTarget, number>();

    const setHidden = (hidden: boolean) => {
      if (root.classList.contains(NAV_HIDDEN_CLASS) !== hidden) {
        root.classList.toggle(NAV_HIDDEN_CLASS, hidden);
      }
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const max = target.scrollHeight - target.clientHeight;
      if (max <= 0) {
        return;
      }

      const top = target.scrollTop;
      const previous = lastTop.get(target);
      lastTop.set(target, top);

      if (previous === undefined) {
        return;
      }

      // Ignore iOS rubber-banding above the top / below the bottom.
      if (top < 0 || top > max) {
        return;
      }

      if (top <= TOP_ZONE_PX) {
        travel.set(target, 0);
        setHidden(false);
        return;
      }

      const delta = top - previous;
      if (delta === 0) {
        return;
      }

      // Accumulate travel in the current direction; reset when it reverses.
      const prevTravel = travel.get(target) ?? 0;
      const nextTravel =
        Math.sign(prevTravel) === Math.sign(delta) ? prevTravel + delta : delta;
      travel.set(target, nextTravel);

      if (nextTravel >= DIRECTION_THRESHOLD_PX) {
        setHidden(true);
      } else if (nextTravel <= -DIRECTION_THRESHOLD_PX) {
        setHidden(false);
      }
    };

    // `scroll` does not bubble; capture it from every scroll container.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      root.classList.remove(CHROME_HIDDEN_CLASS, NAV_HIDDEN_CLASS);
    };
  }, [root]);
}
