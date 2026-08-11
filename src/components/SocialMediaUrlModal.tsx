"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  validateSocialMediaEntry,
  type SocialMediaEntry,
} from "@/lib/contacts/social-media";

interface SocialMediaUrlModalProps {
  entry: SocialMediaEntry;
  isNew: boolean;
  onClose: () => void;
  onSave: (entry: SocialMediaEntry) => void | Promise<void>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="ui-label">{children}</span>;
}

export function SocialMediaUrlModal({
  entry: initialEntry,
  isNew,
  onClose,
  onSave,
}: SocialMediaUrlModalProps) {
  const [entry, setEntry] = useState<SocialMediaEntry>(initialEntry);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEntry(initialEntry);
    setError(null);
  }, [initialEntry]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const update = (patch: Partial<SocialMediaEntry>) => {
    setEntry((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const handleSave = async () => {
    const validationError = validateSocialMediaEntry(entry);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(entry);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save URL. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-media-url-title"
      onClick={onClose}
    >
      <div
        className="ui-card flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="type-meta">Social Media / Websites</p>
            <h2
              id="social-media-url-title"
              className="mt-1 font-sans text-lg font-normal tracking-tight text-foreground"
            >
              {isNew ? "Add URL" : "Edit URL"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>URL *</FieldLabel>
              <input
                type="url"
                value={entry.url}
                onChange={(event) => update({ url: event.target.value })}
                className="ui-input w-full py-2.5 text-sm"
                placeholder="linkedin.com/in/username"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Label</FieldLabel>
              <input
                type="text"
                value={entry.label ?? ""}
                onChange={(event) => update({ label: event.target.value })}
                className="ui-input w-full py-2.5 text-sm"
                placeholder="Optional — e.g. LinkedIn"
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="ui-btn-outline-green px-4 py-2.5 text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!entry.url.trim() || isSaving}
            className="ui-btn-primary px-4 py-2.5 text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Saving…" : isNew ? "Add URL" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
