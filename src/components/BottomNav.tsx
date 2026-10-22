"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock, Home, MessageSquare, Users } from "lucide-react";

const TAB_ROW_PX = 50;

const TABS = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: CalendarClock,
    match: (path: string) => path === "/agenda",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    match: (path: string) => path.startsWith("/contacts"),
  },
  {
    href: "/investment",
    label: "Log",
    icon: Clock,
    match: (path: string) => path === "/investment",
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: MessageSquare,
    match: (path: string) => path === "/feedback",
  },
] as const;

function readSafeBottomPx() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const px = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return Math.round(px);
}

function isStandalone() {
  return (
    document.documentElement.classList.contains("pwa-standalone") ||
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(window.navigator.standalone)
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const pin = () => {
      if (document.documentElement.classList.contains("keyboard-composer-active")) {
        return;
      }

      nav.style.bottom = "0px";
      nav.style.height = `${TAB_ROW_PX}px`;

      const frame = document.getElementById("app-frame");
      const frameBottom = frame?.getBoundingClientRect().bottom ?? window.innerHeight;
      const navBottom = nav.getBoundingClientRect().bottom;
      let gap = Math.round(frameBottom - navBottom);

      if (gap <= 0 && isStandalone()) {
        gap = readSafeBottomPx();
      }

      if (gap > 0) {
        nav.style.bottom = `-${gap}px`;
        nav.style.height = `${TAB_ROW_PX + gap}px`;
      }
    };

    pin();
    const timer = window.setTimeout(pin, 250);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", pin);
    vv?.addEventListener("scroll", pin);
    window.addEventListener("resize", pin);
    window.addEventListener("orientationchange", pin);

    return () => {
      window.clearTimeout(timer);
      vv?.removeEventListener("resize", pin);
      vv?.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
      window.removeEventListener("orientationchange", pin);
    };
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 h-[50px] w-full bg-background border-t border-border/30 transform-none"
    >
      <div className="flex h-[50px] w-full shrink-0 items-center justify-around px-2 pb-1">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav__tab${
                active ? " bottom-nav__tab--active" : ""
              }`}
            >
              <span
                className={`bottom-nav__icon-wrap${
                  active ? " bottom-nav__icon-wrap--active" : ""
                }`}
                aria-hidden="true"
              >
                <Icon className="bottom-nav__icon h-5 w-5" strokeWidth={2} />
              </span>
              <span className="bottom-nav__label mt-0.5 text-[10px] font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
