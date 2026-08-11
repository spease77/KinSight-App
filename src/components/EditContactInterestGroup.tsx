"use client";

import { useEffect, useRef, useState } from "react";
import {
  EditContactAddCard,
  EditContactAddRow,
} from "@/components/EditContactAddRow";
import { EditContactDeletableRow } from "@/components/EditContactDeletableRow";
import {
  createLabeledEntry,
  type LabeledValueEntry,
} from "@/lib/contacts/labeled-contact-fields";

interface EditContactInterestGroupProps {
  entries: LabeledValueEntry[];
  onChange: (entries: LabeledValueEntry[]) => void;
}

export function EditContactInterestGroup({
  entries,
  onChange,
}: EditContactInterestGroupProps) {
  const [focusEntryId, setFocusEntryId] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (!focusEntryId) return;
    const frame = requestAnimationFrame(() => {
      inputRefs.current.get(focusEntryId)?.focus();
      setFocusEntryId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusEntryId, entries]);

  const updateEntry = (id: string, value: string) => {
    onChange(
      entries.map((entry) => (entry.id === id ? { ...entry, value } : entry))
    );
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
    inputRefs.current.delete(id);
  };

  const addEntry = () => {
    const entry = createLabeledEntry("interest");
    onChange([...entries, entry]);
    setFocusEntryId(entry.id);
  };

  if (entries.length === 0) {
    return (
      <EditContactAddCard>
        <EditContactAddRow label="add interest" onClick={addEntry} />
      </EditContactAddCard>
    );
  }

  return (
    <section className="edit-contact-group">
      <div className="edit-contact-group__card">
        {entries.map((entry, index) => (
          <EditContactDeletableRow
            key={entry.id}
            rowId={entry.id}
            onDelete={() => removeEntry(entry.id)}
            bordered={index < entries.length - 1}
            removeAriaLabel="Remove interest"
          >
            <input
              ref={(node) => {
                if (node) {
                  inputRefs.current.set(entry.id, node);
                } else {
                  inputRefs.current.delete(entry.id);
                }
              }}
              type="text"
              value={entry.value}
              onChange={(event) => updateEntry(entry.id, event.target.value)}
              placeholder="Add an interest..."
              className="edit-contact-row__input"
            />
          </EditContactDeletableRow>
        ))}

        <EditContactAddRow
          label="add interest"
          onClick={addEntry}
          bordered={entries.length > 0}
        />
      </div>
    </section>
  );
}
