"use client";

import type { RefObject } from "react";
import { Smartphone, X } from "lucide-react";

interface PhoneContactSyncSheetProps {
  open: boolean;
  accept: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFiles: (files: FileList | null) => void;
}

export function PhoneContactSyncSheet({
  open,
  accept,
  fileInputRef,
  onClose,
  onFiles,
}: PhoneContactSyncSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[110px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-sync-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close import contacts"
        onClick={onClose}
      />
      <div className="ui-card relative w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-hotel-border px-5 py-4">
          <div>
            <p className="type-meta text-muted">Phone contacts</p>
            <h2
              id="phone-sync-title"
              className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
            >
              Import from this device
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 text-sm leading-relaxed text-muted">
          <p>
            iPhone can&apos;t share the Contacts app with a Home Screen web app.
            Export a vCard, then import it here. On Android Chrome, Sync still
            opens the system contact picker.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-foreground">
            <li>Open the Contacts app</li>
            <li>Open a person, or select several</li>
            <li>Tap Share → Save to Files</li>
            <li>Choose that vCard below</li>
          </ol>
          <p>A CSV from Google Contacts works on any phone too.</p>
        </div>

        <div className="border-t border-hotel-border px-5 py-4">
          <label className="ui-btn-green flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Smartphone className="h-4 w-4" strokeWidth={2} />
            Choose vCard or CSV
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
