"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Plus, Settings, Sparkles } from "lucide-react";
import { DataManagementSheet } from "@/components/DataManagementSheet";

const HOME_TAGLINE = "People Intelligence";
const HOME_TAGLINE_TYPE_MS = 45;
const HOME_TAGLINE_DELAY_MS = 1000;

export function HomeTagline() {
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
    return <div className="h-5" aria-hidden="true" />;
  }

  return (
    <div className="flex items-center gap-2 px-1" aria-live="polite">
      <Sparkles
        className={`home-sparkle-icon h-3.5 w-3.5 shrink-0 ${isTyping ? "home-sparkle-flash" : ""}`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span className="ui-badge-green px-2 py-0.5 text-[10px]">
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
      <div className="flex h-full w-full min-w-0 items-start justify-between gap-2">
        {isHome ? (
          <div className="flex min-w-0 flex-col">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground">
              KinSight
            </h1>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                People Intelligence
              </span>
            </div>
          </div>
        ) : (
          <h1 className="min-w-0 truncate font-sans text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {headerActions}

          {showNewSession && onNewSession ? (
            <button
              type="button"
              onClick={onNewSession}
              className="flex h-8 items-center gap-1 rounded-full px-2 text-slate-400 transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Start new session"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span className="text-[10px] font-medium">New</span>
            </button>
          ) : null}

          {isHome ? (
            <button
              type="button"
              onClick={() => setIsDataManagementOpen(true)}
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Open data management settings"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      <DataManagementSheet
        open={isDataManagementOpen}
        onClose={() => setIsDataManagementOpen(false)}
      />
    </>
  );
}
