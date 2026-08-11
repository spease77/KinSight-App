"use client";

import type { ContactDetailCard, ContactDetailCardRow } from "@/lib/contacts/contact-detail-cards";
import { SourceCitation } from "@/components/SourceCitation";
import type { ContactSourceMetadata } from "@/types/source-metadata";

interface ContactInsetGroupProps {
  title?: string;
  children: React.ReactNode;
}

export function ContactInsetGroup({ title, children }: ContactInsetGroupProps) {
  return (
    <section className="contact-inset-group">
      {title ? <h3 className="contact-inset-group__title">{title}</h3> : null}
      <div className="contact-inset-group__card">{children}</div>
    </section>
  );
}

interface ContactInsetRowProps {
  row: ContactDetailCardRow;
  isLast?: boolean;
  contactId?: string;
  sourceMetadata?: ContactSourceMetadata;
  multiline?: boolean;
  onClick?: () => void;
}

export function ContactInsetRow({
  row,
  isLast = false,
  contactId,
  sourceMetadata,
  multiline = false,
  onClick,
}: ContactInsetRowProps) {
  const fieldSource =
    row.fieldKey && sourceMetadata?.[row.fieldKey]
      ? sourceMetadata[row.fieldKey]
      : undefined;

  const labelClassName =
    row.labelStyle === "subtle"
      ? "contact-inset-row__label contact-inset-row__label--subtle"
      : "contact-inset-row__label";

  const valueContent = row.href ? (
    <a href={row.href} className="contact-inset-row__link">
      {row.value}
    </a>
  ) : (
    <span className={multiline ? "contact-inset-row__multiline" : ""}>
      {row.value}
    </span>
  );

  const content = (
    <div
      className={`contact-inset-row ${isLast ? "" : "contact-inset-row--border"}`}
    >
      <div className="contact-inset-row__main">
        <span className={labelClassName}>
          {row.label}
          {fieldSource && contactId && row.fieldKey && (
            <SourceCitation
              contactId={contactId}
              fieldKey={row.fieldKey}
              source={fieldSource}
            />
          )}
        </span>
        <div className="contact-inset-row__value">{valueContent}</div>
        {row.secondary && (
          <p className="contact-inset-row__secondary">{row.secondary}</p>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`contact-inset-row__button ${isLast ? "" : "contact-inset-row--border"}`}
      >
        <div className="contact-inset-row__main">
          <span className={labelClassName}>{row.label}</span>
          <div className="contact-inset-row__value">{valueContent}</div>
          {row.secondary && (
            <p className="contact-inset-row__secondary">{row.secondary}</p>
          )}
        </div>
      </button>
    );
  }

  return content;
}

export function ContactDetailInsetSection({
  title,
  rows,
  contactId,
  sourceMetadata,
}: {
  title?: string;
  rows: ContactDetailCardRow[];
  contactId: string;
  sourceMetadata?: ContactSourceMetadata;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <ContactInsetGroup title={title}>
      {rows.map((row, index) => (
        <ContactInsetRow
          key={row.id}
          row={row}
          isLast={index === rows.length - 1}
          contactId={contactId}
          sourceMetadata={sourceMetadata}
          multiline={row.value.includes("\n")}
        />
      ))}
    </ContactInsetGroup>
  );
}

interface ContactDetailCardsProps {
  cards: ContactDetailCard[];
  contactId: string;
  sourceMetadata?: ContactSourceMetadata;
}

export function ContactDetailCards({
  cards,
  contactId,
  sourceMetadata,
}: ContactDetailCardsProps) {
  if (cards.length === 0) {
    return (
      <p className="contact-inset-empty">
        No intel captured yet. Use the quick-add chips above to start building
        this profile.
      </p>
    );
  }

  return (
    <div className="contact-inset-groups">
      {cards.map((card) => (
        <ContactInsetGroup key={card.id}>
          {card.rows.map((row, index) => (
            <ContactInsetRow
              key={row.id}
              row={row}
              isLast={index === card.rows.length - 1}
              contactId={contactId}
              sourceMetadata={sourceMetadata}
            />
          ))}
        </ContactInsetGroup>
      ))}
    </div>
  );
}
