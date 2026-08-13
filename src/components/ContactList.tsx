"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/contact";
import { ContactAvatar } from "@/components/ContactAvatar";
import {
  type ContactSortDirection,
  type ContactSortField,
  formatContactDisplayName,
  loadContactSortDirection,
  loadContactSortPreference,
  saveContactSortDirection,
  saveContactSortPreference,
  sortContacts,
  toggleContactSortDirection,
} from "@/lib/contacts/sort-contacts";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import { formatTimeInvested, hasLoggedTimeInvested } from "@/lib/time-logs/format-duration";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronRight,
  Clock,
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

function ContactCard({
  contact,
  sortBy,
  totalMinutes,
}: {
  contact: Contact;
  sortBy: ContactSortField;
  totalMinutes: number;
}) {
  const router = useRouter();
  const displayName = formatContactDisplayName(contact.name, sortBy);
  const relationship = contact.relationshipLabel?.trim();
  const company = contact.company?.trim();
  const showMetadataLine = Boolean(relationship || company);
  const showTimeInvested = hasLoggedTimeInvested(totalMinutes);
  const contactHref = contact.id ? `/contacts/${contact.id}` : null;

  const cardBody = (
    <>
      <ContactAvatar
        name={contact.name}
        sortBy={sortBy}
        avatarUrl={contact.avatarUrl}
        size="sm"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-sans text-sm font-normal text-foreground">
          {displayName}
        </p>

        {showMetadataLine ? (
          <p className="truncate text-xs font-normal text-zinc-400">
            {relationship}
            {relationship && company ? (
              <span className="mx-1.5" aria-hidden="true">
                •
              </span>
            ) : null}
            {company}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        {showTimeInvested ? (
          <div className="flex items-center justify-end gap-1.5 text-xs font-normal text-zinc-400">
            <Clock
              className="h-3.5 w-3.5 shrink-0 text-icon"
              strokeWidth={2}
            />
            <span className="whitespace-nowrap tabular-nums">
              {formatTimeInvested(totalMinutes)}
            </span>
          </div>
        ) : null}

        <ChevronRight
          className="h-5 w-5 shrink-0 text-icon transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
    </>
  );

  if (!contactHref) {
    return (
      <li>
        <div className="contact-list-row flex w-full items-center gap-4 px-4 py-3 text-left">
          {cardBody}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={contactHref}
        prefetch
        aria-label={`View ${displayName}`}
        className="contact-list-row group flex w-full cursor-pointer touch-manipulation items-center gap-4 px-4 py-3 text-left active:scale-[0.99]"
        onClick={(event) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }

          event.preventDefault();
          router.push(contactHref);
        }}
      >
        {cardBody}
      </Link>
    </li>
  );
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
      className="ui-card flex flex-wrap items-center gap-2 p-1"
      role="group"
      aria-label="Sort contacts by"
    >
      <button
        type="button"
        onClick={onDirectionToggle}
        aria-label={`Sort ${directionLabel}. Tap to reverse.`}
        title={`Sort ${directionLabel}`}
        className="
          ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
          text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground
        "
      >
        <DirectionIcon className="h-4 w-4" strokeWidth={2} />
      </button>
      {(
        [
          {
            value: "first",
            label: "First name",
            activeClass: "ui-badge-blue px-2.5 py-1 text-xs",
          },
          {
            value: "last",
            label: "Last name",
            activeClass: "ui-badge-green px-2.5 py-1 text-xs",
          },
          {
            value: "relationship",
            label: "Relationship",
            activeClass: "ui-badge-green px-2.5 py-1 text-xs",
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
              flex-1 rounded-lg px-3 py-1.5 text-xs font-normal transition-colors
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

      {!showHeading && (
        <p className="type-meta px-1">
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
        </p>
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
              ? "contact-list-card ui-card"
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
