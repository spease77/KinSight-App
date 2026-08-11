"use client";

import { useState } from "react";
import { RelationshipLabelPickerSheet } from "@/components/RelationshipLabelPickerSheet";
import {
  formatContactRelationshipForEdit,
  normalizeContactRelationship,
} from "@/lib/contacts/contact-relationship";

export function EditContactNameRow({
  label,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={`edit-contact-name-row ${
        isLast ? "" : "edit-contact-name-row--border"
      }`}
    >
      <span className="edit-contact-name-row__label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="edit-contact-name-row__input"
      />
    </div>
  );
}

export function EditContactRelationshipRow({
  label,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isLast?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const displayValue = formatContactRelationshipForEdit(value);

  return (
    <>
      <div
        className={`edit-contact-name-row ${
          isLast ? "" : "edit-contact-name-row--border"
        }`}
      >
        <span className="edit-contact-name-row__label">{label}</span>
        <button
          type="button"
          className="edit-contact-name-row__action edit-contact-action-text"
          onClick={() => setPickerOpen(true)}
        >
          {displayValue}
          <span aria-hidden>›</span>
        </button>
      </div>

      <RelationshipLabelPickerSheet
        open={pickerOpen}
        currentLabel={value.trim() || "select"}
        onClose={() => setPickerOpen(false)}
        onSelect={(nextLabel) => {
          onChange(normalizeContactRelationship(nextLabel));
          setPickerOpen(false);
        }}
      />
    </>
  );
}
