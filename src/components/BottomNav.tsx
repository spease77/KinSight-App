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
      className="bottom-nav z-50 w-full border-t border-border/30 bg-background/95 backdrop-blur-md"
    >
      <div className="bottom-nav__inner mx-auto flex h-[50px] w-full max-w-lg items-center justify-around px-2">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav__tab flex min-w-0 flex-col items-center justify-center gap-0.5 py-0 ${
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
              <span className="bottom-nav__label text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
