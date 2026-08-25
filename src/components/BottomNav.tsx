"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock, Home, MessageSquare, Users } from "lucide-react";

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

  return (
    <nav
      aria-label="Main navigation"
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 w-full bg-background/95 pt-1 pb-1 backdrop-blur-md"
    >
      <div className="bottom-nav__inner mx-auto mb-0 flex h-12 w-full max-w-md items-center justify-around px-2 py-0">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav__tab py-1 ${
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
}
