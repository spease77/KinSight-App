"use client";

import { Check, Loader2 } from "lucide-react";

interface MeetingModalSaveButtonProps {
  formId?: string;
  onClick?: () => void;
  isDirty: boolean;
  isSaving: boolean;
  savingLabel?: string;
  saveLabel?: string;
}

export function MeetingModalSaveButton({
  formId,
  onClick,
  isDirty,
  isSaving,
  savingLabel = "Saving",
  saveLabel = "Save",
}: MeetingModalSaveButtonProps) {
  const sharedProps = {
    disabled: isSaving || !isDirty,
    className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
      isDirty
        ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-80"
        : "pointer-events-none bg-zinc-600 text-white"
    }`,
    "aria-label": isSaving ? savingLabel : saveLabel,
    "aria-disabled": !isDirty || isSaving,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...sharedProps}>
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Check className="h-4 w-4" strokeWidth={3} />
        )}
      </button>
    );
  }

  return (
    <button type="submit" form={formId} {...sharedProps}>
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
      ) : (
        <Check className="h-4 w-4" strokeWidth={3} />
      )}
    </button>
  );
}
