"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Contact } from "@/types/contact";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import {
  type ContactSortDirection,
  type ContactSortField,
  formatContactDisplayName,
  sortContacts,
  toggleContactSortDirection,
} from "@/lib/contacts/sort-contacts";
import {
  RelationshipTreeSortBar,
  INVESTMENT_CONTACT_SORT_FIELDS,
} from "@/components/RelationshipTreeSortBar";
import { formatDurationMinutes, hasLoggedTimeInvested } from "@/lib/time-logs/format-duration";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";

type InvestmentSortField = ContactSortField | "time";

const INVESTMENT_SORT_FIELD_KEY = "kinsight-investment-contact-sort";
const INVESTMENT_SORT_DIRECTION_KEY = "kinsight-investment-contact-sort-direction";

function loadInvestmentSortField(): InvestmentSortField {
  if (typeof window === "undefined") return "time";
  const saved = localStorage.getItem(INVESTMENT_SORT_FIELD_KEY);
  if (
    saved === "first" ||
    saved === "last" ||
    saved === "relationship" ||
    saved === "time"
  ) {
    return saved;
  }
  return "time";
}

function saveInvestmentSortField(field: InvestmentSortField): void {
  localStorage.setItem(INVESTMENT_SORT_FIELD_KEY, field);
}

function loadInvestmentSortDirection(): ContactSortDirection {
  if (typeof window === "undefined") return "desc";
  const saved = localStorage.getItem(INVESTMENT_SORT_DIRECTION_KEY);
  return saved === "asc" ? "asc" : "desc";
}

function saveInvestmentSortDirection(direction: ContactSortDirection): void {
  localStorage.setItem(INVESTMENT_SORT_DIRECTION_KEY, direction);
}

function sortInvestmentContacts(
  contacts: Contact[],
  field: InvestmentSortField,
  direction: ContactSortDirection,
  timeMinutesByContactId: Map<string, number>
): Contact[] {
  if (field !== "time") {
    return sortContacts(contacts, field, direction);
  }

  const sorted = [...contacts].sort((a, b) => {
    const minutesA = timeMinutesByContactId.get(a.id) ?? 0;
    const minutesB = timeMinutesByContactId.get(b.id) ?? 0;
    if (minutesA !== minutesB) return minutesA - minutesB;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

interface InvestmentContactListProps {
  contacts: Contact[];
  selectedContactIds?: string[];
  onContactSelect: (contact: Contact) => void;
  refreshToken?: number;
}

function InvestmentContactRow({
  contact,
  sortBy,
  isSelected,
  totalMinutes,
  onSelect,
}: {
  contact: Contact;
  sortBy: InvestmentSortField;
  isSelected: boolean;
  totalMinutes: number;
  onSelect: (contact: Contact) => void;
}) {
  const displayField: ContactSortField = sortBy === "time" ? "first" : sortBy;
  const displayName = formatContactDisplayName(contact.name, displayField);

  return (
    <button
      type="button"
      onClick={() => onSelect(contact)}
      aria-pressed={isSelected}
      className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${
        isSelected
          ? "border-border-green bg-accent-green-muted/40"
          : "border-border/60 bg-card-hover/50 hover:bg-card-hover"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-sans text-sm text-foreground">
            {displayName}
          </p>
          {contact.relationshipLabel && (
            <span className="ui-badge-green shrink-0 px-2 py-0.5 text-[10px]">
              {contact.relationshipLabel}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
        {formatDurationMinutes(totalMinutes)}
      </span>
    </button>
  );
}

export function InvestmentContactList({
  contacts,
  selectedContactIds = [],
  onContactSelect,
  refreshToken = 0,
}: InvestmentContactListProps) {
  const selectedIdSet = useMemo(
    () => new Set(selectedContactIds),
    [selectedContactIds]
  );
  const [sortBy, setSortBy] = useState<InvestmentSortField>("time");
  const [sortDirection, setSortDirection] =
    useState<ContactSortDirection>("desc");
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
    setSortBy(loadInvestmentSortField());
    setSortDirection(loadInvestmentSortDirection());
  }, []);

  const handleSortChange = (field: InvestmentSortField) => {
    setSortBy(field);
    saveInvestmentSortField(field);
  };

  const handleDirectionToggle = () => {
    const next = toggleContactSortDirection(sortDirection);
    setSortDirection(next);
    saveInvestmentSortDirection(next);
  };

  const trackedContacts = useMemo(
    () =>
      contacts.filter((contact) =>
        hasLoggedTimeInvested(timeMinutesByContactId.get(contact.id))
      ),
    [contacts, timeMinutesByContactId]
  );

  const filteredContacts = useMemo(
    () => filterContacts(trackedContacts, searchQuery),
    [trackedContacts, searchQuery]
  );

  const sortedContacts = useMemo(
    () =>
      sortInvestmentContacts(
        filteredContacts,
        sortBy,
        sortDirection,
        timeMinutesByContactId
      ),
    [filteredContacts, sortBy, sortDirection, timeMinutesByContactId]
  );

  if (contacts.length === 0) {
    return null;
  }

  if (trackedContacts.length === 0) {
    return (
      <section aria-label="Active time allocations" className="flex flex-col gap-3">
        <p className="ui-card type-editorial border-dashed px-4 py-8 text-center text-sm text-muted">
          No active time allocations logged yet. Use a voice note to log your
          first interaction.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Contacts" className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor="investment-contact-search" className="sr-only">
          Search contacts
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          id="investment-contact-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search contacts…"
          autoComplete="off"
          className="ui-input w-full py-2.5 pl-10 pr-10 text-sm"
        />
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <p className="type-meta px-1">
        {searchQuery.trim()
          ? `${filteredContacts.length} of ${trackedContacts.length}`
          : trackedContacts.length}{" "}
        {trackedContacts.length === 1 ? "contact" : "contacts"}
      </p>

      <RelationshipTreeSortBar
        sortField={sortBy}
        sortDirection={sortDirection}
        fields={INVESTMENT_CONTACT_SORT_FIELDS}
        onSortFieldChange={handleSortChange}
        onSortDirectionToggle={handleDirectionToggle}
      />

      <div className="contacts-scroll flex max-h-[min(52vh,28rem)] flex-col gap-2 overflow-y-auto pr-1">
        {sortedContacts.length === 0 ? (
          <p className="px-1 py-2 text-center text-sm text-muted">
            No contacts match your search.
          </p>
        ) : (
          sortedContacts.map((contact) => (
            <InvestmentContactRow
              key={contact.id}
              contact={contact}
              sortBy={sortBy}
              isSelected={selectedIdSet.has(contact.id)}
              totalMinutes={timeMinutesByContactId.get(contact.id) ?? 0}
              onSelect={onContactSelect}
            />
          ))
        )}
      </div>
    </section>
  );
}
