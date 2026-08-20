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
    className: `edit-contact-header__btn edit-contact-header__btn--save${
      isDirty ? "" : " edit-contact-header__btn--inactive"
    }`,
    "aria-label": isSaving ? savingLabel : saveLabel,
    "aria-disabled": !isDirty || isSaving,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...sharedProps}>
        {isSaving ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        ) : (
          <Check className="h-5 w-5" strokeWidth={2.5} />
        )}
      </button>
    );
  }

  return (
    <button type="submit" form={formId} {...sharedProps}>
      {isSaving ? (
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
      ) : (
        <Check className="h-5 w-5" strokeWidth={2.5} />
      )}
    </button>
  );
}
