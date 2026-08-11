"use client";

import {
  forwardRef,
  useEffect,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

export const INLINE_BUBBLE_LABEL_SELECT = "select";

export function formatInlineBubbleLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed || trimmed.toLowerCase() === INLINE_BUBBLE_LABEL_SELECT) {
    return INLINE_BUBBLE_LABEL_SELECT;
  }
  return trimmed.toLowerCase();
}

interface ContactAnchorInlineBubbleProps {
  ariaLabel: string;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  error?: string | null;
  children: ReactNode;
}

export function ContactAnchorInlineBubble({
  ariaLabel,
  onCancel,
  onSave,
  isSaving = false,
  error = null,
  children,
}: ContactAnchorInlineBubbleProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="contact-anchor-inline-bubble"
      role="form"
      aria-label={ariaLabel}
    >
      <div className="contact-anchor-inline-bubble__content">{children}</div>
      <button
        type="button"
        className="contact-anchor-inline-bubble__save-btn"
        onClick={() => void onSave()}
        disabled={isSaving}
        aria-label="Save"
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className="contact-anchor-inline-bubble__cancel-btn"
        onClick={onCancel}
        disabled={isSaving}
        aria-label="Cancel"
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {error ? (
        <p className="contact-anchor-inline-bubble__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContactAnchorInlineBubbleBadge({
  label,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="contact-anchor-inline-bubble__badge"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? `Label: ${label}`}
    >
      {label}
      <span aria-hidden>›</span>
    </button>
  );
}

export const ContactAnchorInlineBubbleInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    onEnter?: () => void;
  }
>(function ContactAnchorInlineBubbleInput(
  { className = "", onEnter, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={`contact-anchor-inline-bubble__input ${className}`.trim()}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter?.();
        }
      }}
    />
  );
});
