"use client";

import { useState } from "react";
import { EditContactAddRow } from "@/components/EditContactAddRow";
import { EditContactDeletableRow } from "@/components/EditContactDeletableRow";
import { LabelPickerSheet } from "@/components/LabelPickerSheet";
import {
  createEmptySocialMediaEntry,
  type SocialMediaEntry,
} from "@/lib/contacts/social-media";
import { formatLabelDisplay } from "@/lib/contacts/labeled-contact-fields";

interface EditContactUrlGroupProps {
  entries: SocialMediaEntry[];
  onChange: (entries: SocialMediaEntry[]) => void;
}

export function EditContactUrlGroup({
  entries,
  onChange,
}: EditContactUrlGroupProps) {
  const [pickerEntryId, setPickerEntryId] = useState<string | null>(null);
  const pickerEntry = entries.find((entry) => entry.id === pickerEntryId);

  const updateEntry = (id: string, patch: Partial<SocialMediaEntry>) => {
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
    onChange([
      ...entries,
      { ...createEmptySocialMediaEntry(), label: "homepage" },
    ]);
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
              removeAriaLabel="Remove URL"
            >
              <button
                type="button"
                className="edit-contact-row__label"
                onClick={() => setPickerEntryId(entry.id)}
              >
                {formatLabelDisplay(entry.label ?? "homepage")}
                <span aria-hidden>›</span>
              </button>

              <input
                type="url"
                value={entry.url}
                onChange={(event) =>
                  updateEntry(entry.id, { url: event.target.value })
                }
                placeholder="https://"
                className="edit-contact-row__input"
              />
            </EditContactDeletableRow>
          ))}

          <EditContactAddRow
            label="add url"
            onClick={addEntry}
            bordered={entries.length > 0}
          />
        </div>
      </section>

      <LabelPickerSheet
        open={pickerEntryId !== null}
        group="url"
        currentLabel={pickerEntry?.label ?? "homepage"}
        onClose={() => setPickerEntryId(null)}
        onSelect={(label) => {
          if (!pickerEntryId) return;
          updateEntry(pickerEntryId, { label });
        }}
      />
    </>
  );
}
