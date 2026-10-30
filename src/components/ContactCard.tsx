"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import type { Contact } from "@/types/contact";
import { ContactAvatar } from "@/components/ContactAvatar";
import { resolveDisplayAvatarUrl } from "@/lib/contacts/contact-avatar-display";
import {
  formatContactDisplayName,
  type ContactSortField,
} from "@/lib/contacts/sort-contacts";
import {
  formatTimeInvested,
  hasLoggedTimeInvested,
} from "@/lib/time-logs/format-duration";

export function ContactCard({
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
  const avatarUrl = resolveDisplayAvatarUrl(contact);

  const cardBody = (
    <>
      <ContactAvatar
        name={contact.name}
        sortBy={sortBy}
        avatarUrl={avatarUrl}
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
        <div className="contact-list-row flex w-full items-center gap-4 py-3 text-left">
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
        className="contact-list-row group flex w-full cursor-pointer touch-manipulation items-center gap-4 py-3 text-left active:scale-[0.99]"
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
