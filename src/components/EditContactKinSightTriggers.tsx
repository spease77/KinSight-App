"use client";

import {
  EditContactAddCard,
  EditContactAddRow,
} from "@/components/EditContactAddRow";
import { createLabeledEntry } from "@/lib/contacts/labeled-contact-fields";
import { createEmptyRelationshipEntry } from "@/lib/contacts/relationship-tree";

export type EditContactKinSightTriggerItem = {
  id: string;
  label: string;
  onClick: () => void;
};

interface EditContactKinSightTriggersProps {
  items: EditContactKinSightTriggerItem[];
  grouped?: boolean;
}

export function EditContactKinSightTriggers({
  items,
  grouped = false,
}: EditContactKinSightTriggersProps) {
  if (items.length === 0) return null;

  if (grouped) {
    return (
      <EditContactAddCard>
        {items.map((item, index) => (
          <EditContactAddRow
            key={item.id}
            label={item.label}
            onClick={item.onClick}
            bordered={index > 0}
          />
        ))}
      </EditContactAddCard>
    );
  }

  return (
    <>
      {items.map((item) => (
        <EditContactAddCard key={item.id}>
          <EditContactAddRow label={item.label} onClick={item.onClick} />
        </EditContactAddCard>
      ))}
    </>
  );
}

export function createBirthdayEntry() {
  return createLabeledEntry("birthday");
}

export function createAnniversaryEntry() {
  return createLabeledEntry("anniversary");
}

export function createMilestoneEntry() {
  return createLabeledEntry("milestone");
}

export function createInterestEntry() {
  return createLabeledEntry("interest");
}

export function createRelatedEntry() {
  return createEmptyRelationshipEntry();
}
