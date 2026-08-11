"use client";

import type { ContactType } from "@/lib/contacts/contact-type";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPES,
  contactTypePillClass,
} from "@/lib/contacts/contact-type";

interface ContactTypeSelectorProps {
  value: ContactType | null | undefined;
  needsConfirmation?: boolean;
  onChange: (type: ContactType) => void;
  disabled?: boolean;
  className?: string;
  centered?: boolean;
}

export function ContactTypeSelector({
  value,
  needsConfirmation = false,
  onChange,
  disabled = false,
  className = "",
  centered = false,
}: ContactTypeSelectorProps) {
  return (
    <div className={className}>
      {needsConfirmation && !value && (
        <div
          className={`flex ${centered ? "justify-center" : "justify-start"}`}
        >
          <span className="contact-type-confirm-hint">Confirm contact type?</span>
        </div>
      )}
      <div
        className={`flex flex-wrap gap-2 ${
          centered ? "justify-center" : ""
        } ${needsConfirmation && !value ? "mt-2" : ""}`}
        role="group"
        aria-label="Contact type"
      >
        {CONTACT_TYPES.map((type) => {
          const isActive = value === type;
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => onChange(type)}
              className={contactTypePillClass(type, isActive)}
              aria-pressed={isActive}
            >
              {CONTACT_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
