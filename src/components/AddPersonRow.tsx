"use client";

import { useEffect, useRef, useState } from "react";
import { EditContactAddRow } from "@/components/EditContactAddRow";
import { EditContactDeletableRow } from "@/components/EditContactDeletableRow";
import { RelationshipLabelPickerSheet } from "@/components/RelationshipLabelPickerSheet";
import {
  applyRelationshipLabelToEntry,
  formatRelationshipLabelDisplay,
  relationshipEntryToDisplayLabel,
} from "@/lib/contacts/relationship-label-presets";
import {
  applyRelationshipNameInputLive,
  formatRelationshipNameInputValue,
  normalizeRelationshipEntryName,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";

interface AddPersonRowProps {
  entry: RelationshipTreeEntry;
  onEntryChange: (entry: RelationshipTreeEntry) => void;
  onRemove?: () => void;
  onCommit?: () => void | Promise<void>;
  onCancel?: () => void;
  showRemove?: boolean;
  autoFocusName?: boolean;
  namePlaceholder?: string;
  bordered?: boolean;
}

export function AddPersonTrigger({
  onClick,
  bordered = false,
  className = "",
}: {
  onClick: () => void;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <EditContactAddRow
      label="add person"
      onClick={onClick}
      bordered={bordered}
      className={className}
    />
  );
}

export function AddPersonRow({
  entry,
  onEntryChange,
  onRemove,
  onCommit,
  onCancel,
  showRemove = false,
  autoFocusName = false,
  namePlaceholder = "Related name",
  bordered = false,
}: AddPersonRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [nameInput, setNameInput] = useState(() =>
    formatRelationshipNameInputValue(entry)
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  const label = relationshipEntryToDisplayLabel(entry);

  useEffect(() => {
    setNameInput(formatRelationshipNameInputValue(entry));
  }, [entry.id]);

  useEffect(() => {
    if (!autoFocusName) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocusName, entry.id]);

  const syncNameInput = (value: string) => {
    setNameInput(value);
    onEntryChange(applyRelationshipNameInputLive(entry, value));
  };

  const commitNormalizedName = () => {
    const normalized = normalizeRelationshipEntryName(entry, nameInput);
    onEntryChange(normalized);
    setNameInput(formatRelationshipNameInputValue(normalized));
    return normalized;
  };

  const handleCommit = async () => {
    if (!onCommit || committingRef.current) return;
    if (!nameInput.trim()) return;

    committingRef.current = true;
    setIsCommitting(true);
    try {
      commitNormalizedName();
      await onCommit();
    } finally {
      setIsCommitting(false);
      committingRef.current = false;
    }
  };

  const rowContent = (
    <>
      <button
        type="button"
        className="edit-contact-row__label"
        onClick={() => setPickerOpen(true)}
      >
        {formatRelationshipLabelDisplay(label)}
        <span aria-hidden>›</span>
      </button>

      <input
        ref={inputRef}
        type="text"
        value={nameInput}
        onChange={(event) => syncNameInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleCommit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel?.();
          }
        }}
        onBlur={() => {
          if (pickerOpen || !onCommit || !nameInput.trim()) return;
          void handleCommit();
        }}
        placeholder={namePlaceholder}
        className="edit-contact-row__input"
        disabled={isCommitting}
      />
    </>
  );

  return (
    <>
      {showRemove && onRemove ? (
        <EditContactDeletableRow
          rowId={entry.id}
          onDelete={onRemove}
          bordered={bordered}
          removeAriaLabel="Remove person"
        >
          {rowContent}
        </EditContactDeletableRow>
      ) : (
        <div
          className={`edit-contact-deletable-row ${
            bordered ? "edit-contact-deletable-row--border" : ""
          }`}
        >
          <div className="edit-contact-row">
            <div className="edit-contact-row__icon-slot" aria-hidden />
            <div className="edit-contact-row__body">{rowContent}</div>
          </div>
        </div>
      )}

      <RelationshipLabelPickerSheet
        open={pickerOpen}
        currentLabel={label}
        onClose={() => setPickerOpen(false)}
        onSelect={(nextLabel) => {
          onEntryChange(applyRelationshipLabelToEntry(entry, nextLabel));
        }}
      />
    </>
  );
}
