"use client";

interface DiscardChangesConfirmModalProps {
  message: string;
  onCancel: () => void;
  onDiscard: () => void;
}

export function DiscardChangesConfirmModal({
  message,
  onCancel,
  onDiscard,
}: DiscardChangesConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-changes-title"
      onClick={onCancel}
    >
      <div
        className="ui-card w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-5">
          <h2
            id="discard-changes-title"
            className="font-sans text-xl font-normal tracking-tight text-foreground"
          >
            Discard changes?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        </div>

        <div className="flex gap-2 border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="ui-btn-outline-green flex-1 px-4 py-3 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex flex-1 items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
