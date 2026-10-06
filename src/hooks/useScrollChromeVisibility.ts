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
  agendaNavOnly: boolean
) {
  const currentTop = element.scrollTop;
  const previousTop = scrollPositions.get(element) ?? currentTop;
  scrollPositions.set(element, currentTop);

  if (currentTop <= 0) {
    applyScrollChromeHidden(false, agendaNavOnly);
    return;
  }

  const delta = currentTop - previousTop;
  if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) return;

  if (delta > 0) {
    applyScrollChromeHidden(true, agendaNavOnly);
  } else {
    applyScrollChromeHidden(false, agendaNavOnly);
  }
}

export function useScrollChromeVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    const agendaNavOnly = isAgendaPath(pathname);
    const scrollPositions = new WeakMap<HTMLElement, number>();

    const onScroll = (event: Event) => {
      if (shouldIgnoreScrollChrome()) return;
      if (!isScrollChromeSource(event.target)) return;

      handleScrollDelta(
        event.target as HTMLElement,
        scrollPositions,
        agendaNavOnly
      );
    };

    clearScrollChromeClasses();

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      clearScrollChromeClasses();
    };
  }, [pathname]);
}
