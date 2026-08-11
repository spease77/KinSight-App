"use client";

import { X } from "lucide-react";

interface LabelPickerModalFrameProps {
  open: boolean;
  entered: boolean;
  title: string;
  ariaLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function LabelPickerModalFrame({
  open,
  entered,
  title,
  ariaLabel,
  onClose,
  children,
}: LabelPickerModalFrameProps) {
  if (!open) return null;

  return (
    <div
      className={`label-picker-sheet__overlay ${
        entered ? "label-picker-sheet__overlay--open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={`label-picker-sheet ${
          entered ? "label-picker-sheet--open" : ""
        }`}
      >
        <header className="label-picker-sheet__header">
          <button
            type="button"
            onClick={onClose}
            className="label-picker-sheet__close"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <h3 className="label-picker-sheet__title">{title}</h3>
          <span className="label-picker-sheet__header-spacer" aria-hidden />
        </header>

        <div className="label-picker-sheet__body contacts-scroll">{children}</div>
      </div>
    </div>
  );
}
