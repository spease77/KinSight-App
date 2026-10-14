"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_DELTA_THRESHOLD = 6;
const CHROME_HIDDEN_CLASS = "scroll-chrome-hidden";
const NAV_HIDDEN_CLASS = "scroll-nav-hidden";

function isAgendaPath(pathname: string): boolean {
  return pathname === "/agenda" || pathname.startsWith("/agenda/");
}

function isScrollChromeSource(element: EventTarget | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.classList.contains("app-scroll")) return true;
  if (element.classList.contains("contacts-scroll")) return true;
  if (element.classList.contains("kinsight-conversation-messages")) return true;
  return false;
}

function shouldIgnoreScrollChrome(): boolean {
  const root = document.documentElement;
  return root.classList.contains("keyboard-composer-active");
}

function applyScrollChromeHidden(hidden: boolean, agendaNavOnly: boolean) {
  if (agendaNavOnly) {
    document.documentElement.classList.toggle(NAV_HIDDEN_CLASS, hidden);
    document.documentElement.classList.remove(CHROME_HIDDEN_CLASS);
    return;
  }

  document.documentElement.classList.toggle(CHROME_HIDDEN_CLASS, hidden);
  document.documentElement.classList.remove(NAV_HIDDEN_CLASS);
}

function clearScrollChromeClasses() {
  document.documentElement.classList.remove(CHROME_HIDDEN_CLASS, NAV_HIDDEN_CLASS);
}

function handleScrollDelta(
  element: HTMLElement,
  scrollPositions: WeakMap<HTMLElement, number>,
  agendaNavOnly: boolean,
  layoutLock: { until: number }
) {
  const currentTop = element.scrollTop;
  const previousTop = scrollPositions.get(element) ?? currentTop;
  scrollPositions.set(element, currentTop);

  if (performance.now() < layoutLock.until) {
    return;
  }

  const delta = currentTop - previousTop;
  if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) return;

  if (delta > 0) {
    applyScrollChromeHidden(true, agendaNavOnly);
    layoutLock.until = performance.now() + 320;
    return;
  }

  applyScrollChromeHidden(false, agendaNavOnly);
  layoutLock.until = performance.now() + 320;
}

export function useScrollChromeVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    const agendaNavOnly = isAgendaPath(pathname);
    const scrollPositions = new WeakMap<HTMLElement, number>();
    const layoutLock = { until: 0 };

    const onScroll = (event: Event) => {
      if (shouldIgnoreScrollChrome()) return;
      if (!isScrollChromeSource(event.target)) return;

      handleScrollDelta(
        event.target as HTMLElement,
        scrollPositions,
        agendaNavOnly,
        layoutLock
      );
    };

    let touchStartY = 0;

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (shouldIgnoreScrollChrome() || agendaNavOnly) return;
      if (performance.now() < layoutLock.until) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const scroller = target.closest(".kinsight-conversation-messages");
      if (!(scroller instanceof HTMLElement)) return;

      const y = event.touches[0]?.clientY ?? 0;
      const dy = y - touchStartY;
      if (Math.abs(dy) < 14) return;

      if (dy < 0) {
        applyScrollChromeHidden(true, false);
        layoutLock.until = performance.now() + 320;
        return;
      }

      if (scroller.scrollTop <= 0) {
        applyScrollChromeHidden(false, false);
        layoutLock.until = performance.now() + 320;
      }
    };

    clearScrollChromeClasses();

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      clearScrollChromeClasses();
    };
  }, [pathname]);
}
