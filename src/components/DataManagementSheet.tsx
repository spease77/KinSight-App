"use client";

import { useEffect } from "react";
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
  const {
    settings,
    isLoading,
    isSaving,
    error,
    updateGlobalNotifications,
  } = useUserSettings();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

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
        className="data-management-sheet relative flex h-full w-full max-w-sm flex-col border-l border-border/80 bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-5">
          <div>
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
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
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
      </aside>
    </div>
  );
}
