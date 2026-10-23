"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock, Home, MessageSquare, Users } from "lucide-react";
import styles from "./bottom-nav.module.css";

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
  // Highlight the tapped tab immediately, before the next route has loaded, so
  // a slow navigation never looks like the tap was ignored (which made people
  // tap again and restart the navigation).
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const effectivePath = pendingPath ?? pathname;

  return (
    <nav aria-label="Main navigation" className={`${styles.fixedNav} bottom-nav`}>
      <div className={styles.navInner}>
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(effectivePath);

          return (
            <Link
              key={href}
              href={href}
              // Pages are force-dynamic. Prefetching them stores an empty,
              // data-less cache entry that Next then treats as the page: the
              // URL changes but the old page stays until a second tap.
              prefetch={false}
              onClick={() => {
                if (!match(pathname)) setPendingPath(href);
              }}
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
              <span className="bottom-nav__label text-[10px] font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
