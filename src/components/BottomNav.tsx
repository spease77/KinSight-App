"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock, Home, MessageSquare, Users } from "lucide-react";
import { useSoftKeyboardOpen } from "@/hooks/useSoftKeyboardOpen";

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
  const keyboardOpen = useSoftKeyboardOpen();

  return (
    <nav
      aria-label="Main navigation"
      aria-hidden={keyboardOpen}
      className={`bottom-nav ${keyboardOpen ? "bottom-nav--keyboard-open" : ""}`}
    >
      <div className="bottom-nav__inner mx-auto flex max-w-lg items-stretch justify-around px-2">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              tabIndex={keyboardOpen ? -1 : undefined}
              className={`bottom-nav__tab flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                active ? "bottom-nav__tab--active" : ""
              }`}
            >
              <Icon
                className="bottom-nav__icon h-6 w-6"
                strokeWidth={active ? 2 : 1.75}
                fill={active ? "currentColor" : "none"}
              />
              <span className="bottom-nav__label text-[10px] font-medium tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
