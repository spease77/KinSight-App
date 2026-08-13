"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import {
  DATE_QUICK_ADD_LABELS,
  QUICK_ADD_ANCHORS,
  resolveDateSubtypeForLabel,
  resolveInterestSubtypeForCategory,
  type QuickAddAnchorId,
} from "@/lib/contacts/contact-quick-add-anchors";
import {
  saveQuickAddDate,
  saveQuickAddInterest,
  saveQuickAddRelationshipEntry,
} from "@/lib/contacts/contact-quick-add-save";
import { showSuccessToast } from "@/lib/ui/toast";
import {
  ContactAnchorInlineBubble,
  ContactAnchorInlineBubbleBadge,
  ContactAnchorInlineBubbleInput,
  INLINE_BUBBLE_LABEL_SELECT,
  formatInlineBubbleLabel,
} from "@/components/ContactAnchorInlineBubble";
import { LabelPickerSheet } from "@/components/LabelPickerSheet";
import { RelationshipLabelPickerSheet } from "@/components/RelationshipLabelPickerSheet";
import {
  applyRelationshipLabelToEntry,
} from "@/lib/contacts/relationship-label-presets";
import {
  applyRelationshipNameInputLive,
  createEmptyRelationshipEntry,
  formatRelationshipNameInputValue,
  normalizeRelationshipEntryName,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";

type InlineQuickAddMode = "closed" | "interest" | "person" | "date";

interface ContactAnchorQuickAddProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
  variant?: "default" | "detail";
}

function AnchorPill({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "detail";
}) {
  return (
    <button
      type="button"
      className={`contact-quick-add-chip contact-anchor-pill whitespace-nowrap transition-colors active:scale-[0.97] ${
        variant === "detail"
          ? "contact-anchor-pill--detail contact-detail-hero__action-chip"
          : "contact-anchor-pill text-foreground hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      + Add {label}
    </button>
  );
}

function InlineInterestQuickAdd({
  contact,
  onCancel,
  onSaved,
}: {
  contact: ContactDetail;
  onCancel: () => void;
  onSaved: (contact: ContactDetail) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { subtype, prefixValue } =
        resolveInterestSubtypeForCategory("general");
      const result = await saveQuickAddInterest(
        contact,
        subtype,
        value,
        undefined,
        { prefixValue }
      );
      if (!result.contact) {
        throw new Error(result.error ?? "Could not save interest.");
      }
      onSaved(result.contact);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save. Try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ContactAnchorInlineBubble
      ariaLabel="Add interest"
      onCancel={onCancel}
      onSave={handleSave}
      isSaving={isSaving}
      error={error}
    >
      <ContactAnchorInlineBubbleInput
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onEnter={() => void handleSave()}
        placeholder="Add an interest..."
        disabled={isSaving}
        aria-label="Interest"
      />
    </ContactAnchorInlineBubble>
  );
}

function InlinePersonQuickAdd({
  contact,
  onCancel,
  onSaved,
}: {
  contact: ContactDetail;
  onCancel: () => void;
  onSaved: (contact: ContactDetail) => void;
}) {
  const [entry, setEntry] = useState<RelationshipTreeEntry>(() =>
    createEmptyRelationshipEntry()
  );
  const [nameInput, setNameInput] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState(
    INLINE_BUBBLE_LABEL_SELECT
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const badgeLabel = formatInlineBubbleLabel(relationshipLabel);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const syncNameInput = (value: string) => {
    setNameInput(value);
    setEntry((current) => applyRelationshipNameInputLive(current, value));
  };

  const handleSave = async () => {
    if (relationshipLabel === INLINE_BUBBLE_LABEL_SELECT) {
      setError("Select a relationship.");
      return;
    }
    if (!nameInput.trim()) {
      setError("Enter a name.");
      return;
    }

    const normalizedEntry = normalizeRelationshipEntryName(entry, nameInput);
    setEntry(normalizedEntry);
    setNameInput(formatRelationshipNameInputValue(normalizedEntry));

    setIsSaving(true);
    setError(null);

    try {
      const result = await saveQuickAddRelationshipEntry(contact, normalizedEntry);
      if (!result.contact) {
        throw new Error(result.error ?? "Could not save person.");
      }
      onSaved(result.contact);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save. Try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ContactAnchorInlineBubble
        ariaLabel="Add person"
        onCancel={onCancel}
        onSave={handleSave}
        isSaving={isSaving}
        error={error}
      >
        <ContactAnchorInlineBubbleBadge
          label={badgeLabel}
          onClick={() => setPickerOpen(true)}
          disabled={isSaving}
          ariaLabel={`Relationship label: ${badgeLabel}`}
        />
        <ContactAnchorInlineBubbleInput
          ref={inputRef}
          type="text"
          value={nameInput}
          onChange={(event) => syncNameInput(event.target.value)}
          onEnter={() => void handleSave()}
          placeholder="Related name"
          disabled={isSaving}
          aria-label="Related name"
        />
      </ContactAnchorInlineBubble>

      <RelationshipLabelPickerSheet
        open={pickerOpen}
        currentLabel={relationshipLabel}
        onClose={() => setPickerOpen(false)}
        onSelect={(nextLabel) => {
          setRelationshipLabel(nextLabel);
          setEntry((current) =>
            applyRelationshipLabelToEntry(current, nextLabel)
          );
          setError(null);
        }}
      />
    </>
  );
}

function InlineDateQuickAdd({
  contact,
  onCancel,
  onSaved,
}: {
  contact: ContactDetail;
  onCancel: () => void;
  onSaved: (contact: ContactDetail) => void;
}) {
  const [dateLabel, setDateLabel] = useState(INLINE_BUBBLE_LABEL_SELECT);
  const [dateValue, setDateValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const badgeLabel = formatInlineBubbleLabel(dateLabel);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSave = async () => {
    if (dateLabel === INLINE_BUBBLE_LABEL_SELECT) {
      setError("Select a date label.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { subtype, customLabel } = resolveDateSubtypeForLabel(dateLabel);
      const result = await saveQuickAddDate(
        contact,
        subtype,
        dateValue,
        customLabel
      );
      if (!result.contact) {
        throw new Error(result.error ?? "Could not save date.");
      }
      onSaved(result.contact);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save. Try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ContactAnchorInlineBubble
        ariaLabel="Add date"
        onCancel={onCancel}
        onSave={handleSave}
        isSaving={isSaving}
        error={error}
      >
        <ContactAnchorInlineBubbleBadge
          label={badgeLabel}
          onClick={() => setPickerOpen(true)}
          disabled={isSaving}
          ariaLabel={`Date label: ${badgeLabel}`}
        />
        <ContactAnchorInlineBubbleInput
          ref={inputRef}
          type="date"
          value={dateValue}
          onChange={(event) => {
            setDateValue(event.target.value);
            setError(null);
          }}
          onEnter={() => void handleSave()}
          disabled={isSaving}
          aria-label="Date"
        />
      </ContactAnchorInlineBubble>

      <LabelPickerSheet
        open={pickerOpen}
        group="date"
        presets={[...DATE_QUICK_ADD_LABELS]}
        currentLabel={dateLabel}
        onClose={() => setPickerOpen(false)}
        onSelect={(label) => {
          setDateLabel(label);
          setError(null);
        }}
      />
    </>
  );
}

export function ContactAnchorQuickAdd({
  contact,
  onContactUpdate,
  variant = "default",
}: ContactAnchorQuickAddProps) {
  const [inlineMode, setInlineMode] = useState<InlineQuickAddMode>("closed");

  const closeInline = useCallback(() => {
    setInlineMode("closed");
  }, []);

  const openAnchor = (anchorId: QuickAddAnchorId) => {
    if (anchorId === "interest") {
      setInlineMode("interest");
      return;
    }
    if (anchorId === "person") {
      setInlineMode("person");
      return;
    }
    if (anchorId === "date") {
      setInlineMode("date");
      return;
    }
  };

  const handleSaved = (updated: ContactDetail, message: string) => {
    onContactUpdate?.(updated);
    showSuccessToast(message);
    setInlineMode("closed");
  };

  const renderInlineBubble = () => {
    switch (inlineMode) {
      case "interest":
        return (
          <InlineInterestQuickAdd
            contact={contact}
            onCancel={closeInline}
            onSaved={(updated) => handleSaved(updated, "Interest saved")}
          />
        );
      case "person":
        return (
          <InlinePersonQuickAdd
            contact={contact}
            onCancel={closeInline}
            onSaved={(updated) => handleSaved(updated, "Person added")}
          />
        );
      case "date":
        return (
          <InlineDateQuickAdd
            contact={contact}
            onCancel={closeInline}
            onSaved={(updated) => handleSaved(updated, "Date saved")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`contact-quick-add-chips contact-anchor-pills ${
        variant === "detail"
          ? "contact-anchor-pills--detail mx-auto flex w-full justify-center px-4"
          : ""
      }`}
      role="list"
      aria-label="Quick add"
    >
      <div
        className={`contact-quick-add-chips__track contact-anchor-pills__track ${
          variant === "detail"
            ? "flex flex-nowrap items-center justify-center gap-2"
            : ""
        } ${
          inlineMode !== "closed"
            ? "contact-anchor-pills__track--inline-active"
            : ""
        }`}
      >
        {inlineMode !== "closed" ? (
          renderInlineBubble()
        ) : (
          QUICK_ADD_ANCHORS.map((anchor) => (
            <AnchorPill
              key={anchor.id}
              label={anchor.label}
              variant={variant}
              onClick={() => openAnchor(anchor.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
