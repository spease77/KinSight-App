"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHROME_HIDDEN_CLASS = "scroll-chrome-hidden";
const NAV_HIDDEN_CLASS = "scroll-nav-hidden";

/** Pixels of movement in one direction before the chrome reacts. */
const DIRECTION_THRESHOLD_PX = 10;
/** Within this distance of the top of a scroller the chrome is always shown. */
const TOP_ZONE_PX = 24;
/** Only finger/wheel scrolling counts; auto-scroll to new messages must not hide anything. */
const USER_SCROLL_WINDOW_MS = 1500;

/**
 * Swipe up (content scrolls down) tucks the chrome away, swipe down (content
 * scrolls back up) brings it back.
 *
 * - Every page: the floating tab bar (`html.scroll-nav-hidden`).
 * - Home chat (once text has been entered): also the title bar and the ask bar
 *   (`html.scroll-chrome-hidden`, only styled inside `.home-dashboard--conversation`).
 *
 * These are paint-only effects (opacity / `translate` / header `transform`); the
 * locked tab bar and dock `top`/`position` are never touched.
 */
export function useScrollChromeVisibility() {
  const pathname = usePathname();
  const root = typeof document === "undefined" ? null : document.documentElement;

  // Always show everything when the route changes.
  useEffect(() => {
    root?.classList.remove(CHROME_HIDDEN_CLASS, NAV_HIDDEN_CLASS);
  }, [pathname, root]);

  useEffect(() => {
    if (!root) {
      return;
    }

    const lastTop = new WeakMap<EventTarget, number>();
    const travel = new WeakMap<EventTarget, number>();
    let lastUserInput = 0;

    const markUserInput = () => {
      lastUserInput = Date.now();
    };

    const setHidden = (hidden: boolean) => {
      if (hidden && root.classList.contains("keyboard-composer-active")) {
        return;
      }
      root.classList.toggle(NAV_HIDDEN_CLASS, hidden);
      root.classList.toggle(CHROME_HIDDEN_CLASS, hidden);
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

      // Programmatic scrolling (new chat messages, scroll anchoring) is ignored.
      if (Date.now() - lastUserInput > USER_SCROLL_WINDOW_MS) {
        travel.set(target, 0);
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
    const opts = { capture: true, passive: true } as const;
    document.addEventListener("scroll", onScroll, opts);
    document.addEventListener("touchmove", markUserInput, opts);
    document.addEventListener("wheel", markUserInput, opts);

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("touchmove", markUserInput, { capture: true });
      document.removeEventListener("wheel", markUserInput, { capture: true });
      root.classList.remove(CHROME_HIDDEN_CLASS, NAV_HIDDEN_CLASS);
    };
  }, [root]);
}
