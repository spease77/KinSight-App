"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { LabelPickerModalFrame } from "@/components/LabelPickerModalFrame";
import {
  RELATIONSHIP_LABEL_PRESET_SECTIONS,
  formatRelationshipLabelDisplay,
  isCustomRelationshipLabel,
} from "@/lib/contacts/relationship-label-presets";

interface RelationshipLabelPickerSheetProps {
  open: boolean;
  currentLabel: string;
  onClose: () => void;
  onSelect: (label: string) => void;
}

export function RelationshipLabelPickerSheet({
  open,
  currentLabel,
  onClose,
  onSelect,
}: RelationshipLabelPickerSheetProps) {
  const [entered, setEntered] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  const normalizedCurrent = formatRelationshipLabelDisplay(currentLabel);
  const isCustomSelected = isCustomRelationshipLabel(currentLabel);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setCustomLabel("");
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    setCustomLabel(isCustomSelected ? normalizedCurrent : "");

    return () => cancelAnimationFrame(frame);
  }, [open, isCustomSelected, normalizedCurrent]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSaveCustom = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    onClose();
  };

  const handlePresetSelect = (preset: string) => {
    onSelect(preset);
    onClose();
  };

  return (
    <LabelPickerModalFrame
      open={open}
      entered={entered}
      title="Relationship"
      ariaLabel="Choose relationship"
      onClose={onClose}
    >
      <div className="label-picker-sheet__relationship-body">
        {RELATIONSHIP_LABEL_PRESET_SECTIONS.map((section) => (
          <div
            key={section.title || "primary"}
            className="label-picker-sheet__group"
          >
            {section.title ? (
              <p className="label-picker-sheet__section-title">
                {section.title}
              </p>
            ) : null}
            {section.labels.map((preset) => {
              const selected =
                formatRelationshipLabelDisplay(preset) === normalizedCurrent;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`label-picker-sheet__option ${
                    selected ? "label-picker-sheet__option--selected" : ""
                  }`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <span>{preset}</span>
                  {selected ? (
                    <span
                      className="label-picker-sheet__option-check"
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}

        <div className="label-picker-sheet__group label-picker-sheet__custom-section">
          <p className="label-picker-sheet__section-title">Custom label</p>

          {isCustomSelected ? (
            <div className="label-picker-sheet__option label-picker-sheet__option--selected label-picker-sheet__custom-selected">
              <span>{normalizedCurrent}</span>
              <span className="label-picker-sheet__option-check" aria-hidden>
                ✓
              </span>
            </div>
          ) : null}

          <div className="label-picker-sheet__custom-inline">
            <input
              type="text"
              value={customLabel}
              onChange={(event) => setCustomLabel(event.target.value)}
              placeholder="Add custom relationship…"
              className="label-picker-sheet__custom-inline-input"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSaveCustom();
                }
              }}
            />
            <button
              type="button"
              className="label-picker-sheet__custom-inline-save"
              onClick={handleSaveCustom}
              disabled={!customLabel.trim()}
              aria-label="Save custom relationship"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </LabelPickerModalFrame>
  );
}
