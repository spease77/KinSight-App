"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpAZ,
  ChevronRight,
} from "lucide-react";
import { formatContactFullName } from "@/lib/contacts/parse-contact-name";
import { formatDurationMinutes, hasLoggedTimeInvested } from "@/lib/time-logs/format-duration";
import {
  investmentSortDirectionLabel,
  sortInvestmentContacts,
} from "@/lib/time-logs/sort-investment-contacts";
import type {
  InvestmentContactSummary,
  InvestmentSortField,
} from "@/types/time-log";

const SORT_OPTIONS: { value: InvestmentSortField; label: string }[] = [
  { value: "time", label: "Time Spent" },
  { value: "last_name", label: "Last Name" },
  { value: "first_name", label: "First Name" },
];

interface InvestmentContactsListProps {
  contacts: InvestmentContactSummary[];
}

export function InvestmentContactsList({
  contacts,
}: InvestmentContactsListProps) {
  const [sortBy, setSortBy] = useState<InvestmentSortField>("time");
  const [isDescending, setIsDescending] = useState(true);

  const trackedContacts = useMemo(
    () => contacts.filter((contact) => hasLoggedTimeInvested(contact.totalMinutes)),
    [contacts]
  );

  const sortedContacts = useMemo(
    () => sortInvestmentContacts(trackedContacts, sortBy, isDescending),
    [trackedContacts, sortBy, isDescending]
  );

  const DirectionIcon =
    sortBy === "time"
      ? isDescending
        ? ArrowDown
        : ArrowUp
      : isDescending
        ? ArrowUpAZ
        : ArrowDownAZ;

  const directionLabel = investmentSortDirectionLabel(sortBy, isDescending);

  if (trackedContacts.length === 0) {
    return (
      <p className="ui-card type-editorial border-dashed px-4 py-8 text-center text-sm text-muted">
        No active time allocations logged yet. Use a voice note to log your
        first interaction.
      </p>
    );
  }

  return (
    <section aria-label="Contacts by time invested" className="flex flex-col gap-3">
      <div className="ui-card flex items-center gap-2 p-2">
        <label htmlFor="investment-sort" className="sr-only">
          Sort contacts by
        </label>
        <select
          id="investment-sort"
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as InvestmentSortField)
          }
          className="ui-input min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setIsDescending((current) => !current)}
          aria-label={`Sort direction: ${directionLabel}. Tap to reverse.`}
          title={directionLabel}
          className="
            flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
            text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground
          "
        >
          <DirectionIcon className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {sortedContacts.map((contact) => {
          const fullName = formatContactFullName(
            contact.firstName,
            contact.lastName
          );

          return (
            <li key={contact.contactId}>
              <Link
                href={`/contacts/${contact.contactId}`}
                className="ui-card ui-card-interactive group flex w-full items-center gap-3 px-4 py-3.5 active:scale-[0.99]"
              >
                <p className="min-w-0 flex-1 truncate font-sans text-sm text-foreground">
                  {fullName}
                </p>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {formatDurationMinutes(contact.totalMinutes)}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-icon transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
