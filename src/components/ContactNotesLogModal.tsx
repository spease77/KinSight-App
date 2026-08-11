"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import type { ContactNoteEntry } from "@/lib/contacts/notes-log";
import {
  formatNoteLogTimestamp,
  sortNotesNewestFirst,
} from "@/lib/contacts/notes-log";
import { ContactNotesImportExport } from "@/components/ContactNotesImportExport";

type TextMatch = {
  entryId: string;
  start: number;
  end: number;
};

function findMatches(entries: ContactNoteEntry[], query: string): TextMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: TextMatch[] = [];
  for (const entry of entries) {
    const haystack = entry.content.toLowerCase();
    let start = 0;
    while (start < haystack.length) {
      const index = haystack.indexOf(needle, start);
      if (index === -1) break;
      matches.push({
        entryId: entry.id,
        start: index,
        end: index + needle.length,
      });
      start = index + needle.length;
    }
  }
  return matches;
}

function HighlightedContent({
  content,
  entryId,
  query,
  activeMatch,
  matches,
}: {
  content: string;
  entryId: string;
  query: string;
  activeMatch: TextMatch | null;
  matches: TextMatch[];
}) {
  const entryMatches = matches.filter((match) => match.entryId === entryId);
  if (!query.trim() || entryMatches.length === 0) {
    return <>{content}</>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of entryMatches) {
    if (match.start > cursor) {
      parts.push(content.slice(cursor, match.start));
    }

    const isActive =
      activeMatch?.entryId === match.entryId &&
      activeMatch.start === match.start &&
      activeMatch.end === match.end;

    parts.push(
      <mark
        key={`${match.start}-${match.end}`}
        data-note-match={isActive ? "active" : "true"}
        className={
          isActive
            ? "rounded-sm bg-accent-orange text-foreground"
            : "rounded-sm bg-accent-yellow-muted text-foreground"
        }
      >
        {content.slice(match.start, match.end)}
      </mark>
    );
    cursor = match.end;
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return <>{parts}</>;
}

interface ContactNotesLogModalProps {
  contact: ContactDetail;
  onClose: () => void;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactNotesLogModal({
  contact,
  onClose,
  onContactUpdate,
}: ContactNotesLogModalProps) {
  const entries = contact.notesLog ?? [];
  const contactName = contact.name;
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortedEntries = useMemo(
    () => sortNotesNewestFirst(entries),
    [entries]
  );
  const matches = useMemo(
    () => findMatches(sortedEntries, searchQuery),
    [sortedEntries, searchQuery]
  );
  const activeMatch = matches[matchIndex] ?? null;

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!activeMatch) return;
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector('[data-note-match="active"]');
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMatch, matchIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const goToNext = () => {
    if (matches.length === 0) return;
    setMatchIndex((current) => (current + 1) % matches.length);
  };

  const goToPrevious = () => {
    if (matches.length === 0) return;
    setMatchIndex((current) => (current - 1 + matches.length) % matches.length);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-notes-log-title"
      onClick={onClose}
    >
      <div
        className="ui-card flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="type-meta">KinSight Activity History</p>
            <h2
              id="contact-notes-log-title"
              className="mt-1 font-sans text-lg font-normal tracking-tight text-foreground"
            >
              {contactName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
            aria-label="Close KinSight activity history"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <ContactNotesImportExport
            contact={contact}
            onContactUpdate={onContactUpdate}
            className="mb-3"
          />
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search activity"
                className="ui-input w-full py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={goToPrevious}
              disabled={matches.length === 0}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-icon transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-40"
              aria-label="Previous match"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={matches.length === 0}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-icon transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-40"
              aria-label="Next match"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          {searchQuery.trim() && (
            <p className="type-meta mt-2">
              {matches.length === 0
                ? "No matches"
                : `${matchIndex + 1} of ${matches.length} matches`}
            </p>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {sortedEntries.length === 0 ? (
            <p className="text-sm text-muted">
              No activity yet. Record or add information from Home to build this history.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-border bg-card-hover/50 px-4 py-3"
                >
                  <p className="font-mono text-xs text-muted">
                    {formatNoteLogTimestamp(entry.recordedAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    <HighlightedContent
                      content={entry.content}
                      entryId={entry.id}
                      query={searchQuery}
                      activeMatch={activeMatch}
                      matches={matches}
                    />
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
