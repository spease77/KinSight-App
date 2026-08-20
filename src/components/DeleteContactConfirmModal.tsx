"use client";

import { Loader2 } from "lucide-react";
import {
  CONTACTS_DELETE_POLICY_SQL,
  isContactsDeletePolicyError,
  SUPABASE_SQL_EDITOR_URL,
} from "@/lib/supabase/sql-editor-url";

interface DeleteContactConfirmModalProps {
  firstName: string;
  lastName: string;
  isDeleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteContactConfirmModal({
  firstName,
  lastName,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DeleteContactConfirmModalProps) {
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-contact-title"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <div
        className="ui-card max-h-[min(100%,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] w-full max-w-md overflow-y-auto shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-5">
          <h2
            id="delete-contact-title"
            className="font-sans text-xl font-normal tracking-tight text-foreground"
          >
            Delete Contact?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Are you sure you want to delete {displayName || "this contact"}?
            This action cannot be undone.
          </p>
        </div>

        {error ? (
          isContactsDeletePolicyError(error) ? (
            <div
              className="mx-5 mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200"
              role="alert"
            >
              <p className="font-medium text-red-300">
                Your database needs a one-time setup before contacts can be deleted.
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                <li>
                  Open the{" "}
                  <a
                    href={SUPABASE_SQL_EDITOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    Supabase SQL Editor
                  </a>{" "}
                  (opens in a new tab)
                </li>
                <li>
                  Copy all of the SQL below, paste it into the editor, and click{" "}
                  <strong>Run</strong>
                </li>
                <li>Come back here and try deleting again</li>
              </ol>
              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-red-100">
                {CONTACTS_DELETE_POLICY_SQL}
              </pre>
            </div>
          ) : (
            <p className="px-5 pb-2 text-xs text-red-400" role="alert">
              {error}
            </p>
          )
        ) : null}

        <div className="flex gap-2 border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="ui-btn-outline-green flex-1 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : null}
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
