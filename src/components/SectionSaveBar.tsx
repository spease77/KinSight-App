"use client";

import { Loader2 } from "lucide-react";

interface SectionSaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  error?: string | null;
  message?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function SectionSaveBar({
  isDirty,
  isSaving,
  error,
  message,
  onSave,
  onCancel,
}: SectionSaveBarProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
      {error && <p className="text-xs text-red-300">{error}</p>}
      {message && !error && (
        <p className="text-xs text-muted">{message}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving || !isDirty}
          className="ui-btn-outline-green px-3.5 py-2 text-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="ui-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
