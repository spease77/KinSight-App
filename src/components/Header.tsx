"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Plus, Settings, Sparkles } from "lucide-react";
import { DataManagementSheet } from "@/components/DataManagementSheet";

const HOME_TAGLINE = "People Intelligence";
const HOME_TAGLINE_TYPE_MS = 45;
const HOME_TAGLINE_DELAY_MS = 1000;

function HomeTagline() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [visibleLength, setVisibleLength] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setIsVisible(false);
    setVisibleLength(0);
    setIsTyping(true);

    const delayTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, HOME_TAGLINE_DELAY_MS);

    return () => window.clearTimeout(delayTimer);
  }, [pathname]);

  useEffect(() => {
    if (!isVisible) return;

    if (visibleLength >= HOME_TAGLINE.length) {
      setIsTyping(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleLength((current) => current + 1);
    }, HOME_TAGLINE_TYPE_MS);

    return () => window.clearTimeout(timer);
  }, [visibleLength, pathname, isVisible]);

  if (!isVisible) {
    return (
      <div
        className="mt-1.5 h-[1.375rem]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="mt-1.5 flex items-center gap-2" aria-live="polite">
      <Sparkles
        className={`home-sparkle-icon h-4 w-4 shrink-0 ${isTyping ? "home-sparkle-flash" : ""}`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span className="ui-badge-green px-2 py-0.5">
        {HOME_TAGLINE.slice(0, visibleLength)}
        {isTyping ? (
          <span className="opacity-50" aria-hidden="true">
            |
          </span>
        ) : null}
      </span>
    </div>
  );
}

interface HeaderProps {
  /** Omit on the home page to show KinSight branding. */
  title?: string;
  showNewSession?: boolean;
  onNewSession?: () => void;
  headerActions?: ReactNode;
}

export function Header({
  title,
  showNewSession = false,
  onNewSession,
  headerActions,
}: HeaderProps) {
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const isHome = title == null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-main px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-sans text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            {isHome ? "KinSight" : title}
          </h1>

          <div className="flex shrink-0 items-center gap-1">
            {headerActions}

            {showNewSession && onNewSession ? (
              <button
                type="button"
                onClick={onNewSession}
                className="flex h-9 items-center gap-1 rounded-full px-2.5 text-slate-400 transition-colors hover:bg-card-hover hover:text-foreground"
                aria-label="Start new session"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                <span className="text-xs font-medium">New</span>
              </button>
            ) : null}

            {isHome ? (
              <button
                type="button"
                onClick={() => setIsDataManagementOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-card-hover hover:text-foreground"
                aria-label="Open data management settings"
              >
                <Settings className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </div>

        {isHome ? <HomeTagline /> : null}
      </header>

      <DataManagementSheet
        open={isDataManagementOpen}
        onClose={() => setIsDataManagementOpen(false)}
      />
    </>
  );
}
