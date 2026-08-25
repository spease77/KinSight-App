"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Clock, Home, MessageSquare, Users } from "lucide-react";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

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

export function BottomNav() {
  const pathname = usePathname();
  const { shouldHideChrome } = useKeyboardOpen();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nav = (
    <nav
      aria-label="Main navigation"
      aria-hidden={shouldHideChrome}
      inert={shouldHideChrome ? true : undefined}
      className={`bottom-nav w-full px-4${
        shouldHideChrome ? " bottom-nav--keyboard-open" : ""
      }`}
    >
      <div className="bottom-nav__inner">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              tabIndex={shouldHideChrome ? -1 : undefined}
              className={`bottom-nav__tab ${
                active ? "bottom-nav__tab--active" : ""
              }`}
            >
              <span
                className={`bottom-nav__icon-wrap${
                  active ? " bottom-nav__icon-wrap--active" : ""
                }`}
                aria-hidden="true"
              >
                <Icon className="bottom-nav__icon" strokeWidth={2} />
              </span>
              <span className="bottom-nav__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(nav, document.body);
}
