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
      className="bottom-nav w-full flex-none bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="bottom-nav__inner">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
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
}
