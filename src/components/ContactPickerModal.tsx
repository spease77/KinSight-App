"use client";

import { Loader2 } from "lucide-react";
import { ContactAvatar } from "@/components/ContactAvatar";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";

export type ContactPickerCandidate = {
  contactId: string;
  name: string;
  company?: string;
  role?: string;
  confidence?: number;
};

interface ContactPickerModalProps {
  spokenName: string;
  candidates: ContactPickerCandidate[];
  remaining?: number;
  isSaving?: boolean;
  error?: string | null;
  onSelect: (contactId: string) => void;
  onSkip: () => void;
}

export function ContactPickerModal({
  spokenName,
  candidates,
  remaining = 1,
  isSaving = false,
  error,
  onSelect,
  onSkip,
}: ContactPickerModalProps) {
  const label = spokenName.trim() || "this person";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-picker-title"
    >
      <div className="ui-card w-full max-w-md overflow-hidden shadow-2xl">
        <div className="border-b border-hotel-border px-5 py-4">
          <p className="type-meta text-muted">
            Which contact did you mean?
            {remaining > 1 ? ` · ${remaining} left` : ""}
          </p>
          <h2
            id="contact-picker-title"
            className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
          >
            {label}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Tap the right person. KinSight will remember this name for next time.
          </p>
        </div>

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-5 py-4">
          {candidates.map((candidate) => (
            <button
              key={candidate.contactId}
              type="button"
              disabled={isSaving}
              onClick={() => onSelect(candidate.contactId)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card-hover px-3 py-2.5 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ContactAvatar name={candidate.name} size="sm" className="!h-9 !w-9 !text-sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">
                  {formatContactDisplayName(candidate.name, "first")}
                </span>
                {candidate.company || candidate.role ? (
                  <span className="block truncate text-xs text-muted">
                    {[candidate.role, candidate.company].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          {error ? (
            <p className="text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            className="ui-btn-outline-green w-full px-4 py-2.5 text-sm"
            disabled={isSaving}
            onClick={onSkip}
          >
            {isSaving ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              "None of these"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
