"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_DELTA_THRESHOLD = 6;
const CHROME_HIDDEN_CLASS = "scroll-chrome-hidden";

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

function setChromeHidden(hidden: boolean) {
  document.documentElement.classList.toggle(CHROME_HIDDEN_CLASS, hidden);
}

export function useScrollChromeVisibility() {
  const pathname = usePathname();

  useEffect(() => {
    if (isAgendaPath(pathname)) {
      setChromeHidden(false);
      return;
    }

    const scrollPositions = new WeakMap<HTMLElement, number>();

    const onScroll = (event: Event) => {
      if (shouldIgnoreScrollChrome()) return;
      if (!isScrollChromeSource(event.target)) return;

      const element = event.target;
      const currentTop = element.scrollTop;
      const previousTop = scrollPositions.get(element) ?? currentTop;
      scrollPositions.set(element, currentTop);

      if (currentTop <= 0) {
        setChromeHidden(false);
        return;
      }

      const delta = currentTop - previousTop;
      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) return;

      if (delta > 0) {
        setChromeHidden(true);
      } else {
        setChromeHidden(false);
      }
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      setChromeHidden(false);
    };
  }, [pathname]);
}
