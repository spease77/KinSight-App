"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Database, Download, Loader2, X } from "lucide-react";
import { CalendarIntegrationsSection } from "@/components/settings/CalendarIntegrationsSection";
import { ThemeAppearanceSection } from "@/components/settings/ThemeAppearanceSection";
import { useUserSettings } from "@/hooks/useUserSettings";

interface DataManagementSheetProps {
  open: boolean;
  onClose: () => void;
}

export function DataManagementSheet({
  open,
  onClose,
}: DataManagementSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const {
    settings,
    isLoading,
    isSaving,
    error,
    updateGlobalNotifications,
  } = useUserSettings();

  const handleScroll = useCallback(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    setHeaderScrolled(scrollTop > 6);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    setHeaderScrolled(false);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close data management panel"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-management-sheet-title"
        className="data-management-sheet relative flex h-[100dvh] max-h-[100dvh] w-full max-w-sm flex-col overflow-hidden border-l border-border/80 bg-card shadow-2xl"
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="data-management-sheet__scroll no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto [-webkit-overflow-scrolling:touch]"
        >
          <header
            className={`data-management-sheet__header sticky top-0 z-20 flex shrink-0 items-start justify-between gap-3 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-200 ${
              headerScrolled
                ? "border-b border-border/60 bg-card/80 shadow-sm backdrop-blur-md"
                : "border-b border-transparent bg-card"
            }`}
          >
            <div className="min-w-0 pr-2">
              <p className="type-meta">Settings</p>
              <h2
                id="data-management-sheet-title"
                className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
              >
                Data Management
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Appearance, notifications, calendar integrations, and data export.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="relative z-30 -mr-1 shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </header>

          <div className="flex flex-col gap-5 px-5 pb-6 pt-2">
          <ThemeAppearanceSection />

          <section className="flex flex-col gap-3">
            <div>
              <h3 className="type-section-title font-sans text-sm tracking-tight text-foreground">
                Notification Protocol
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Master control for 45-day maintenance reminders at 14 and 5 days
                remaining.
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card-hover/40 px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm text-foreground">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-icon" />
                ) : (
                  <Bell className="h-4 w-4 text-icon" strokeWidth={2} />
                )}
                Global push alerts
              </span>
              <input
                type="checkbox"
                checked={settings.globalNotificationsEnabled}
                disabled={isLoading || isSaving}
                onChange={(event) =>
                  void updateGlobalNotifications(event.target.checked)
                }
                className="h-4 w-4 accent-[var(--accent-green)]"
                aria-label="Enable global push alerts"
              />
            </label>

            {error && (
              <p className="text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
          </section>

          <CalendarIntegrationsSection />

          <Link
            href="/data-management"
            onClick={onClose}
            className="ui-btn-green flex w-full items-center justify-center gap-2.5 px-4 py-4 text-sm font-medium shadow-lg shadow-black/20"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            Export &amp; Backup Network Data
          </Link>

          <div className="ui-card flex items-start gap-3 border-dashed p-4">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-icon" strokeWidth={2} />
            <p className="text-sm leading-relaxed text-muted">
              Choose contacts, pick Excel or Markdown dossier formats, and
              generate a portable backup of your KinSight network.
            </p>
          </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
