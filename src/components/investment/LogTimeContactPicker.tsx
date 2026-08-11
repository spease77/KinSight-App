"use client";

import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Contact } from "@/types/contact";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useContacts } from "@/hooks/useContacts";
import {
  formatLoggedDurationAction,
  resolveLoggedDurationMinutes,
  todayForDateInput,
} from "@/lib/time-logs/format-duration";
import { readApiJson } from "@/lib/api/read-json";
import { LogTimeNotesField } from "@/components/LogTimeNotesField";
import { LogTimeMeetingFormatField } from "@/components/LogTimeMeetingFormatField";
import { LogTimeDurationField } from "@/components/LogTimeDurationField";
import {
  DEFAULT_DURATION_ADJUSTMENT,
  DEFAULT_MEETING_FORMAT,
  type DurationAdjustment,
  type MeetingFormat,
} from "@/types/time-log";
import { Plus, Search, X } from "lucide-react";

interface LogTimeContactPickerProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  onContactSelect?: (contact: Contact) => void;
  onLogged?: () => void;
}

export function LogTimeContactPicker({
  selectedContacts,
  onContactsChange,
  onContactSelect,
  onLogged,
}: LogTimeContactPickerProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const { contacts, isLoading } = useContacts();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loggedDate, setLoggedDate] = useState(() => todayForDateInput());
  const [minutes, setMinutes] = useState("");
  const [durationAdjustment, setDurationAdjustment] =
    useState<DurationAdjustment>(DEFAULT_DURATION_ADJUSTMENT);
  const [notes, setNotes] = useState("");
  const [meetingFormat, setMeetingFormat] =
    useState<MeetingFormat>(DEFAULT_MEETING_FORMAT);
  const [isSaving, setIsSaving] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(selectedContacts.map((contact) => contact.id)),
    [selectedContacts]
  );

  const availableContacts = useMemo(
    () => contacts.filter((contact) => !selectedIds.has(contact.id)),
    [contacts, selectedIds]
  );

  const filteredContacts = useMemo(
    () => filterContacts(availableContacts, searchQuery),
    [availableContacts, searchQuery]
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const addContact = (contact: Contact) => {
    if (selectedIds.has(contact.id)) return;
    if (onContactSelect) {
      onContactSelect(contact);
    } else {
      onContactsChange([...selectedContacts, contact]);
    }
    setSearchQuery("");
    setIsOpen(false);
    setMessage(null);
    setError(null);
  };

  const removeContact = (contactId: string) => {
    onContactsChange(
      selectedContacts.filter((contact) => contact.id !== contactId)
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (selectedContacts.length === 0) {
      setError("Add at least one contact.");
      setIsOpen(true);
      return;
    }

    const durationMinutes = resolveLoggedDurationMinutes(
      minutes,
      durationAdjustment
    );
    if (durationMinutes === null) {
      setError("Enter how many minutes.");
      return;
    }

    if (!loggedDate.trim()) {
      setError("Enter the date for this time entry.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts.map((contact) => contact.id),
          durationMinutes,
          loggedDate: loggedDate.trim(),
          notes: notes.trim() || undefined,
          meetingFormat,
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save time.");
      }

      setMinutes("");
      setDurationAdjustment(DEFAULT_DURATION_ADJUSTMENT);
      setNotes("");
      setLoggedDate(todayForDateInput());
      setMeetingFormat(DEFAULT_MEETING_FORMAT);
      setShowEntryForm(false);

      const action = formatLoggedDurationAction(durationMinutes);
      const contactLabel =
        selectedContacts.length === 1
          ? selectedContacts[0].name
          : `${selectedContacts.length} contacts`;

      setMessage(`${action.verb} ${action.label} with ${contactLabel}.`);
      onLogged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save time.");
    } finally {
      setIsSaving(false);
    }
  };

  const showList = Boolean(
    isOpen && !isLoading && (availableContacts.length > 0 || searchQuery.trim())
  );

  return (
    <section
      ref={containerRef}
      aria-label="Log time for contacts"
      className="flex flex-col gap-4"
    >
      {selectedContacts.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selected contacts">
          {selectedContacts.map((contact) => (
            <li key={contact.id}>
              <span className="ui-badge-green inline-flex items-center gap-1.5 px-2.5 py-1 text-xs">
                {formatContactDisplayName(contact.name, "first")}
                <button
                  type="button"
                  onClick={() => removeContact(contact.id)}
                  className="rounded-sm text-foreground/80 transition-colors hover:text-foreground"
                  aria-label={`Remove ${contact.name}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <label htmlFor="invest-log-contact-search" className="sr-only">
          Select contact(s)
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          id="invest-log-contact-search"
          type="search"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsOpen(true);
            setMessage(null);
            setError(null);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select contact(s)…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="ui-input w-full py-2.5 pl-10 pr-10 text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setIsOpen(true);
            }}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}

        {showList && (
          <ul
            id={listboxId}
            role="listbox"
            className="contacts-scroll absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 flex max-h-52 flex-col gap-1 overflow-y-auto rounded-xl border border-border-green bg-card p-1.5 shadow-lg"
          >
            {filteredContacts.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted">
                {availableContacts.length === 0
                  ? "All contacts are already selected"
                  : "No contacts found"}
              </li>
            ) : (
              filteredContacts.map((contact) => (
                <li key={contact.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => addContact(contact)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-foreground transition-colors hover:bg-card-hover"
                  >
                    <ContactAvatar
                      name={contact.name}
                      avatarUrl={contact.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {formatContactDisplayName(contact.name, "first")}
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-icon" strokeWidth={2} />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col items-center gap-3"
      >
        {showEntryForm && (
          <div className="flex w-full flex-col gap-2">
            <LogTimeMeetingFormatField
              value={meetingFormat}
              onChange={setMeetingFormat}
            />
            <label className="flex flex-col gap-1.5">
              <span className="ui-label">Date</span>
              <input
                id="invest-log-date"
                type="date"
                value={loggedDate}
                onChange={(event) => setLoggedDate(event.target.value)}
                className="ui-input px-3 py-2 text-sm"
              />
            </label>
            <LogTimeDurationField
              id="invest-log-duration"
              minutes={minutes}
              adjustment={durationAdjustment}
              onMinutesChange={setMinutes}
              onAdjustmentChange={setDurationAdjustment}
            />
            <LogTimeNotesField
              id="invest-log-notes"
              value={notes}
              onChange={setNotes}
            />
          </div>
        )}
        {showEntryForm ? (
          <button
            type="submit"
            disabled={isSaving}
            className="ui-btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Log Time"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setError(null);
              setShowEntryForm(true);
            }}
            className="ui-btn-primary px-6 py-2.5 text-sm"
          >
            Log Time
          </button>
        )}
      </form>

      {isLoading && <p className="type-meta">Loading contacts…</p>}

      {message && <p className="type-meta text-foreground">{message}</p>}
      {error && (
        <p className="ui-alert-error px-3 py-2 text-xs" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
