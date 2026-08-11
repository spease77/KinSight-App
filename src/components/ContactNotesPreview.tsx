"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import { getNotesLogPreview } from "@/lib/contacts/notes-log";
import { ContactNotesLogModal } from "@/components/ContactNotesLogModal";
import { ContactNotesImportExport } from "@/components/ContactNotesImportExport";

interface ContactNotesPreviewProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactNotesPreview({
  contact,
  onContactUpdate,
}: ContactNotesPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const entries = contact.notesLog ?? [];
  const preview = getNotesLogPreview(entries);

  return (
    <>
      <div className="ui-card overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          aria-expanded={isExpanded}
        >
          <p className="type-section-title font-sans text-sm tracking-tight">
            KinSight Activity History
          </p>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        {isExpanded && (
          <div className="flex flex-col gap-3 border-t border-hotel-border px-4 py-4">
            <ContactNotesImportExport
              contact={contact}
              onContactUpdate={onContactUpdate}
            />
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full rounded-lg border border-border/60 bg-card-hover/50 p-3.5 text-left transition-colors hover:opacity-90"
            >
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-foreground">
                {preview}
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted">
                Tap to open full KinSight activity history
              </p>
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ContactNotesLogModal
          contact={contact}
          onClose={() => setIsModalOpen(false)}
          onContactUpdate={onContactUpdate}
        />
      )}
    </>
  );
}
