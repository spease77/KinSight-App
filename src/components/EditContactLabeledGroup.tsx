"use client";

import { useState } from "react";
import { EditContactAddRow } from "@/components/EditContactAddRow";
import { EditContactDeletableRow } from "@/components/EditContactDeletableRow";
import { LabelPickerSheet } from "@/components/LabelPickerSheet";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import {
  createLabeledEntry,
  formatLabelDisplay,
  type LabelPresetGroup,
  type LabeledValueEntry,
} from "@/lib/contacts/labeled-contact-fields";

interface EditContactLabeledGroupProps {
  group: LabelPresetGroup;
  entries: LabeledValueEntry[];
  onChange: (entries: LabeledValueEntry[]) => void;
  addLabel: string;
  placeholder?: string;
  inputType?: "text" | "date" | "tel" | "email" | "url";
}

export function EditContactLabeledGroup({
  group,
  entries,
  onChange,
  addLabel,
  placeholder,
  inputType = "text",
}: EditContactLabeledGroupProps) {
  const [pickerEntryId, setPickerEntryId] = useState<string | null>(null);
  const pickerEntry = entries.find((entry) => entry.id === pickerEntryId);

  const updateEntry = (id: string, patch: Partial<LabeledValueEntry>) => {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    );
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  const addEntry = () => {
    const defaultLabel =
      group === "phone"
        ? "mobile"
        : group === "email"
          ? "work"
          : group === "address"
            ? "home"
            : group === "date"
              ? "birthday"
              : "other";
    onChange([...entries, createLabeledEntry(defaultLabel)]);
  };

  return (
    <>
      <section className="edit-contact-group">
        <div className="edit-contact-group__card">
          {entries.map((entry, index) => (
            <EditContactDeletableRow
              key={entry.id}
              rowId={entry.id}
              onDelete={() => removeEntry(entry.id)}
              bordered={index < entries.length - 1}
              removeAriaLabel="Remove entry"
            >
              <button
                type="button"
                className="edit-contact-row__label"
                onClick={() => setPickerEntryId(entry.id)}
              >
                {formatLabelDisplay(entry.label)}
                <span aria-hidden>›</span>
              </button>

              {group === "phone" ? (
                <PhoneNumberInput
                  value={entry.value}
                  onChange={(e164) => updateEntry(entry.id, { value: e164 })}
                  placeholder={placeholder ?? "Phone"}
                  className="edit-contact-row__phone-input"
                />
              ) : (
                <input
                  type={inputType}
                  value={entry.value}
                  onChange={(event) =>
                    updateEntry(entry.id, { value: event.target.value })
                  }
                  placeholder={placeholder}
                  className="edit-contact-row__input"
                />
              )}
            </EditContactDeletableRow>
          ))}

          <EditContactAddRow
            label={addLabel}
            onClick={addEntry}
            bordered={entries.length > 0}
          />
        </div>
      </section>

      <LabelPickerSheet
        open={pickerEntryId !== null}
        group={group}
        currentLabel={pickerEntry?.label ?? ""}
        onClose={() => setPickerEntryId(null)}
        onSelect={(label) => {
          if (!pickerEntryId) return;
          updateEntry(pickerEntryId, { label });
        }}
      />
    </>
  );
}
