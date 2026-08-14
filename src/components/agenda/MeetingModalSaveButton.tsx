"use client";

import { Check, Loader2 } from "lucide-react";

interface MeetingModalSaveButtonProps {
  formId: string;
  isActive: boolean;
  isSaving: boolean;
  savingLabel?: string;
  saveLabel?: string;
}

export function MeetingModalSaveButton({
  formId,
  isActive,
  isSaving,
  savingLabel = "Saving",
  saveLabel = "Save",
}: MeetingModalSaveButtonProps) {
  return (
    <button
      type="submit"
      form={formId}
      disabled={isSaving || !isActive}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
        isActive
          ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-80"
          : "pointer-events-none bg-zinc-700/60 text-zinc-400"
      }`}
      aria-label={isSaving ? savingLabel : saveLabel}
      aria-disabled={!isActive || isSaving}
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
      ) : (
        <Check className="h-4 w-4" strokeWidth={3} />
      )}
    </button>
  );
}
