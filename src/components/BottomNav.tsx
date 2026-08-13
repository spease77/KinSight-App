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
      className="
        fixed inset-x-0 bottom-0 z-[100] border-t border-white/5
        bg-main/95 backdrop-blur-md
        [padding-bottom:env(safe-area-inset-bottom)]
      "
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-2.5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav__tab flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
                active ? "bottom-nav__tab--active" : "hover:text-foreground"
              }`}
            >
              <Icon
                className="bottom-nav__icon h-5 w-5"
                strokeWidth={active ? 2.25 : 2}
              />
              <span
                className={`bottom-nav__label text-[10px] font-normal tracking-wide`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
