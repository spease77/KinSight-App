"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@/types/contact";
import { ContactCard } from "@/components/ContactCard";
import {
  type ContactSortDirection,
  type ContactSortField,
  loadContactSortDirection,
  loadContactSortPreference,
  saveContactSortDirection,
  saveContactSortPreference,
  sortContacts,
  toggleContactSortDirection,
} from "@/lib/contacts/sort-contacts";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Search,
  X,
} from "lucide-react";

interface ContactListProps {
  contacts: Contact[];
  fullPage?: boolean;
  showHeading?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  refreshToken?: number;
}

function SortToggle({
  value,
  direction,
  onChange,
  onDirectionToggle,
}: {
  value: ContactSortField;
  direction: ContactSortDirection;
  onChange: (field: ContactSortField) => void;
  onDirectionToggle: () => void;
}) {
  const DirectionIcon = direction === "asc" ? ArrowDownAZ : ArrowUpAZ;
  const directionLabel = direction === "asc" ? "A to Z" : "Z to A";

  return (
    <div
      className="flex flex-nowrap items-center gap-1"
      role="group"
      aria-label="Sort contacts by"
    >
      {(
        [
          {
            value: "first",
            label: "First name",
            activeClass: "ui-badge-blue px-1 py-1 text-xs",
          },
          {
            value: "last",
            label: "Last name",
            activeClass: "ui-badge-green px-1 py-1 text-xs",
          },
          {
            value: "relationship",
            label: "Relationship",
            activeClass: "ui-badge-green px-1 py-1 text-xs",
          },
        ] as const
      ).map((field) => {
        const active = value === field.value;

        return (
          <button
            key={field.value}
            type="button"
            onClick={() => onChange(field.value)}
            aria-pressed={active}
            className={`
              min-w-0 flex-1 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-center text-xs font-normal transition-colors
              ${
                active
                  ? field.activeClass
                  : "text-muted hover:text-foreground"
              }
            `}
          >
            {field.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onDirectionToggle}
        aria-label={`Sort ${directionLabel}. Tap to reverse.`}
        title={`Sort ${directionLabel}`}
        className="
          mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
          text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground
        "
      >
        <DirectionIcon className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function ContactSearch({
  value,
  onChange,
  resultCount,
  totalCount,
}: {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  const isFiltering = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="contact-search" className="sr-only">
        Search contacts
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          id="contact-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search contacts…"
          autoComplete="off"
          className="ui-input w-full py-2.5 pl-10 pr-10 text-sm"
        />
        {isFiltering && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      {isFiltering && (
        <p className="type-meta px-1">
          {resultCount} of {totalCount}{" "}
          {totalCount === 1 ? "contact" : "contacts"}
        </p>
      )}
    </div>
  );
}

export function ContactList({
  contacts,
  fullPage = false,
  showHeading = true,
  sortable = false,
  searchable = false,
  refreshToken = 0,
}: ContactListProps) {
  const [sortBy, setSortBy] = useState<ContactSortField>("first");
  const [sortDirection, setSortDirection] =
    useState<ContactSortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const { contacts: timeSummaries } = useInvestmentSummary(refreshToken);

  const timeMinutesByContactId = useMemo(() => {
    const map = new Map<string, number>();
    for (const summary of timeSummaries) {
      map.set(summary.contactId, summary.totalMinutes);
    }
    return map;
  }, [timeSummaries]);

  useEffect(() => {
    setSortBy(loadContactSortPreference());
    setSortDirection(loadContactSortDirection());
  }, []);

  const handleSortChange = (field: ContactSortField) => {
    setSortBy(field);
    saveContactSortPreference(field);
  };

  const handleDirectionToggle = () => {
    const next = toggleContactSortDirection(sortDirection);
    setSortDirection(next);
    saveContactSortDirection(next);
  };

  const filteredContacts = useMemo(
    () => (searchable ? filterContacts(contacts, searchQuery) : contacts),
    [contacts, searchQuery, searchable]
  );

  const sortedContacts = useMemo(
    () =>
      sortable
        ? sortContacts(filteredContacts, sortBy, sortDirection)
        : filteredContacts,
    [filteredContacts, sortBy, sortDirection, sortable]
  );

  return (
    <section
      aria-labelledby={showHeading ? "contacts-heading" : undefined}
      className="flex flex-col gap-3"
    >
      {showHeading && (
        <div className="flex items-baseline justify-between px-1">
          <h2
            id="contacts-heading"
            className="type-section-title font-sans text-xl tracking-tight text-foreground"
          >
            Your Contacts
          </h2>
          <span className="type-meta">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </span>
        </div>
      )}

      {searchable && contacts.length > 0 && (
        <ContactSearch
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={filteredContacts.length}
          totalCount={contacts.length}
        />
      )}

      {sortable && contacts.length > 0 && (
        <SortToggle
          value={sortBy}
          direction={sortDirection}
          onChange={handleSortChange}
          onDirectionToggle={handleDirectionToggle}
        />
      )}

      {searchable && searchQuery.trim() && sortedContacts.length === 0 && (
        <p className="ui-card type-editorial border-dashed px-4 py-6 text-center text-sm text-muted">
          No contacts match &ldquo;{searchQuery.trim()}&rdquo;
        </p>
      )}

      {sortedContacts.length > 0 && (
        <ul
          className={
            fullPage
              ? "contact-list-card"
              : "contact-list-card ui-card contacts-scroll max-h-[38vh] overflow-y-auto pr-1 sm:max-h-[42vh]"
          }
        >
          {sortedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              sortBy={sortBy}
              totalMinutes={timeMinutesByContactId.get(contact.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
