"use client";

import { useEffect, useState } from "react";
import { LabelPickerModalFrame } from "@/components/LabelPickerModalFrame";
import type { LabelPresetGroup } from "@/lib/contacts/labeled-contact-fields";
import { LABEL_PRESETS } from "@/lib/contacts/labeled-contact-fields";

interface LabelPickerSheetProps {
  open: boolean;
  group: LabelPresetGroup;
  currentLabel: string;
  onClose: () => void;
  onSelect: (label: string) => void;
  presets?: string[];
  title?: string;
}

export function LabelPickerSheet({
  open,
  group,
  currentLabel,
  onClose,
  onSelect,
  presets,
  title = "Label",
}: LabelPickerSheetProps) {
  const [entered, setEntered] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setShowCustom(false);
      setCustomLabel("");
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
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

  const presetOptions = presets ?? LABEL_PRESETS[group];

  const formatPickerLabel = (label: string) => label.trim().toLowerCase();

  const normalizedCurrent = formatPickerLabel(
    currentLabel === "select" ? "" : currentLabel
  );

  const handlePresetSelect = (preset: string) => {
    if (formatPickerLabel(preset) === "other") {
      setShowCustom(true);
      return;
    }
    onSelect(formatPickerLabel(preset));
    onClose();
  };

  return (
    <LabelPickerModalFrame
      open={open}
      entered={entered}
      title={title}
      ariaLabel="Choose label"
      onClose={onClose}
    >
      {!showCustom ? (
        <>
          <div className="label-picker-sheet__group">
            {presetOptions.map((preset) => {
              const displayLabel = formatPickerLabel(preset);
              const selected =
                displayLabel !== "other" && displayLabel === normalizedCurrent;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`label-picker-sheet__option ${
                    selected ? "label-picker-sheet__option--selected" : ""
                  }`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <span>{displayLabel}</span>
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
          <button
            type="button"
            className="label-picker-sheet__custom-trigger"
            onClick={() => setShowCustom(true)}
          >
            Add Custom Label
          </button>
        </>
      ) : (
        <div className="label-picker-sheet__custom">
          <input
            type="text"
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
            placeholder="e.g. renewal date, graduation…"
            className="ui-input w-full px-3 py-2.5 text-sm"
            autoFocus
          />
          <div className="label-picker-sheet__custom-actions">
            <button
              type="button"
              className="ui-btn-outline px-4 py-2 text-sm"
              onClick={() => setShowCustom(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="ui-btn-primary px-4 py-2 text-sm"
              onClick={() => {
                const trimmed = customLabel.trim();
                if (!trimmed) return;
                onSelect(formatPickerLabel(trimmed));
                onClose();
              }}
            >
              Save Label
            </button>
          </div>
        </div>
      )}
    </LabelPickerModalFrame>
  );
}
