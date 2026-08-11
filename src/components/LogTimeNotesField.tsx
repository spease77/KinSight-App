"use client";

import { useEffect, useId, useRef, useState } from "react";

interface LogTimeNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function LogTimeNotesField({
  value,
  onChange,
  id,
}: LogTimeNotesFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isExpanded) {
      setDraft(value);
    }
  }, [value, isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      textareaRef.current?.focus();
    }
  }, [isExpanded]);

  const openExpanded = () => {
    setDraft(value);
    setIsExpanded(true);
  };

  const handleBlur = () => {
    onChange(draft.trim());
    setIsExpanded(false);
  };

  if (isExpanded) {
    return (
      <label className="flex w-full flex-col gap-1.5">
        <span className="ui-label">Notes</span>
        <textarea
          ref={textareaRef}
          id={fieldId}
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            onChange(next);
          }}
          onBlur={handleBlur}
          placeholder="What did you work on or discuss?"
          rows={5}
          className="ui-input min-h-[8.5rem] w-full resize-y px-3 py-2.5 text-sm leading-relaxed"
        />
      </label>
    );
  }

  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="ui-label">Notes</span>
      <button
        type="button"
        id={fieldId}
        onClick={openExpanded}
        className="ui-input w-full px-3 py-2 text-left text-sm text-foreground"
      >
        {value ? (
          <span className="line-clamp-2 whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="text-muted">Add notes (optional)</span>
        )}
      </button>
    </label>
  );
}
