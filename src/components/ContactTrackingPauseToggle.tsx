"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import { readApiJson } from "@/lib/api/read-json";

interface ContactTrackingPauseToggleProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
  variant?: "default" | "header";
}

export function ContactTrackingPauseToggle({
  contact,
  onContactUpdate,
  variant = "default",
}: ContactTrackingPauseToggleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPaused = contact.isTrackingPaused ?? false;

  const handleToggle = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contact.id}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrackingPaused: !isPaused }),
      });

      const data = await readApiJson<{
        contact?: ContactDetail;
        error?: string;
      }>(res);

      if (!res.ok || !data.contact) {
        throw new Error(data.error ?? "Could not update reminder pause.");
      }

      onContactUpdate?.(data.contact);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update reminder pause."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (variant === "header") {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={isSaving}
          aria-pressed={isPaused}
          className={`contact-header-pause-btn inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            isPaused
              ? "bg-accent-orange/15 text-foreground"
              : "bg-white/10 text-muted hover:bg-white/14 hover:text-foreground"
          }`}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Bell className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          {isPaused ? "Resume reminders" : "Pause reminders"}
        </button>
        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={isSaving}
        aria-pressed={isPaused}
        className={`ui-btn-outline flex w-full items-center justify-center gap-2 px-3.5 py-2.5 text-xs ${
          isPaused ? "border-accent-orange/60 text-foreground" : ""
        }`}
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <Bell className="h-3.5 w-3.5 text-icon" strokeWidth={2} />
        )}
        {isPaused
          ? "Resume Operational Reminders"
          : "Pause Operational Reminders"}
      </button>
      {error && (
        <p className="text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
