"use client";

import { createDefaultMotherRelationshipEntry } from "@/lib/contacts/relationship-label-presets";
import type { RelationshipTreeEntry } from "@/lib/contacts/relationship-tree";
import { AddPersonRow, AddPersonTrigger } from "@/components/AddPersonRow";

interface EditContactRelatedGroupProps {
  entries: RelationshipTreeEntry[];
  onChange: (entries: RelationshipTreeEntry[]) => void;
}

export function EditContactRelatedGroup({
  entries,
  onChange,
}: EditContactRelatedGroupProps) {
  const addEntry = () => {
    onChange([createDefaultMotherRelationshipEntry(), ...entries]);
  };

  const updateEntry = (id: string, nextEntry: RelationshipTreeEntry) => {
    onChange(entries.map((entry) => (entry.id === id ? nextEntry : entry)));
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  return (
    <section className="edit-contact-group">
      <div className="edit-contact-group__card">
        {entries.map((entry, index) => (
          <AddPersonRow
            key={entry.id}
            entry={entry}
            onEntryChange={(nextEntry) => updateEntry(entry.id, nextEntry)}
            onRemove={() => removeEntry(entry.id)}
            showRemove
            autoFocusName={index === 0 && !entry.firstName?.trim()}
            bordered={index < entries.length - 1}
          />
        ))}

        <AddPersonTrigger onClick={addEntry} bordered={entries.length > 0} />
      </div>
    </section>
  );
}
