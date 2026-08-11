"use client";

import { useEffect, useRef, useState } from "react";
import { LabelPickerModalFrame } from "@/components/LabelPickerModalFrame";
import {
  CONTACT_FACT_CATEGORY_PRESETS,
  formatFactWithCategory,
  type ContactFactCategory,
} from "@/lib/contacts/contact-facts";

interface AddContactFactSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (fact: string) => void;
}

export function AddContactFactSheet({
  open,
  onClose,
  onSave,
}: AddContactFactSheetProps) {
  const [entered, setEntered] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<ContactFactCategory | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setDraft("");
      setSelectedCategory(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setEntered(true);
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSave = () => {
    const fact = formatFactWithCategory(selectedCategory, draft);
    if (!fact) return;
    onSave(fact);
    onClose();
  };

  return (
    <LabelPickerModalFrame
      open={open}
      entered={entered}
      title="Add Fact"
      ariaLabel="Add a contact fact"
      onClose={onClose}
    >
      <div className="edit-contact-fact-sheet">
        <p className="edit-contact-fact-sheet__hint">
          Add a fact, detail, or memory…
        </p>

        <div className="edit-contact-fact-sheet__pills" role="list">
          {CONTACT_FACT_CATEGORY_PRESETS.map((category) => {
            const selected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="listitem"
                className={`edit-contact-fact-sheet__pill ${
                  selected ? "edit-contact-fact-sheet__pill--selected" : ""
                }`}
                onClick={() =>
                  setSelectedCategory((current) =>
                    current === category ? null : category
                  )
                }
              >
                {category}
              </button>
            );
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. Prefers oat milk lattes, met at golf tournament…"
          rows={4}
          className="edit-contact-fact-sheet__textarea"
        />

        <div className="edit-contact-fact-sheet__actions">
          <button
            type="button"
            className="label-picker-sheet__custom-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="label-picker-sheet__custom-save"
            onClick={handleSave}
            disabled={!draft.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </LabelPickerModalFrame>
  );
}
