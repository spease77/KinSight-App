"use client";

import { useState } from "react";
import type { AmbiguousIntelItem } from "@/lib/contacts/extract-contact-intel";

interface IntelAttributionModalProps {
  item: AmbiguousIntelItem;
  remaining: number;
  isSaving?: boolean;
  error?: string | null;
  onAddToContact: () => void;
  onSkip: () => void;
}

export function IntelAttributionModal({
  item,
  remaining,
  isSaving = false,
  error,
  onAddToContact,
  onSkip,
}: IntelAttributionModalProps) {
  const [busy, setBusy] = useState<"contact" | "skip" | null>(null);
  const contactName = item.contactName || "this contact";
  const saving = isSaving || busy !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intel-attribution-title"
    >
      <div className="ui-card w-full max-w-md overflow-hidden shadow-2xl">
        <div className="border-b border-hotel-border px-5 py-4">
          <p className="type-meta text-muted">
            Confirm where this belongs
            {remaining > 1 ? ` · ${remaining} left` : ""}
          </p>
          <h2
            id="intel-attribution-title"
            className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
          >
            Who should this be added to?
          </h2>
          <p className="mt-2 text-sm text-muted">{item.reason}</p>
        </div>

        <div className="px-5 py-4">
          <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-foreground">
            {item.text}
          </p>
          {error ? (
            <p className="mt-3 text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            className="ui-btn-primary px-4 py-2.5 text-sm"
            disabled={saving}
            onClick={() => {
              setBusy("contact");
              onAddToContact();
            }}
          >
            Add as a fact on {contactName}
          </button>
          <button
            type="button"
            className="ui-btn-outline-green px-4 py-2.5 text-sm"
            disabled={saving}
            onClick={() => {
              setBusy("skip");
              onSkip();
            }}
          >
            Skip until that person is named
          </button>
        </div>
      </div>
    </div>
  );
}
