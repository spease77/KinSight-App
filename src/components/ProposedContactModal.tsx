"use client";

import { Check, Loader2, UserPlus, X } from "lucide-react";
import { getProposedPersonIdentity } from "@/lib/ai/contact-knowledge";
import type { ContactReviewItem } from "@/hooks/useProposedContactQueue";

interface ProposedContactModalProps {
  item: ContactReviewItem;
  index: number;
  total: number;
  isSaving: boolean;
  error?: string | null;
  onConfirm: () => void;
  onSkip: () => void;
}

export function ProposedContactModal({
  item,
  index,
  total,
  isSaving,
  error,
  onConfirm,
  onSkip,
}: ProposedContactModalProps) {
  const isUpdate = item.kind === "update";
  const person = isUpdate ? item.update.person : item.proposal.person;
  const summary = isUpdate ? item.update.summary : item.proposal.summary;
  const identity = getProposedPersonIdentity(person);
  const company =
    identity.company ||
    (isUpdate ? item.update.existingCompany : "") ||
    "Unknown company";

  const titleName = [identity.firstName, identity.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || person.displayName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposed-contact-title"
    >
      <div className="ui-card ui-card-tint-orange w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-hotel-border px-5 py-4">
          <div>
            <p className="type-meta text-accent-orange">
              {isUpdate ? "Update contact" : "New contact"} {index + 1} of {total}
            </p>
            <h2
              id="proposed-contact-title"
              className="mt-1 font-sans text-xl font-normal tracking-tight text-foreground"
            >
              {isUpdate ? "Save updates for this contact?" : `Create ${titleName}?`}
            </h2>
            <p className="mt-2 font-sans text-sm text-foreground">
              <span className="text-muted">First:</span> {identity.firstName || "—"}
              {" · "}
              <span className="text-muted">Last:</span> {identity.lastName || "—"}
              {" · "}
              <span className="text-muted">Company:</span> {company}
            </p>
            {person.relationshipHint && (
              <p className="type-meta mt-1 normal-case tracking-normal">
                {person.relationshipHint}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onSkip}
            disabled={isSaving}
            className="text-muted transition-colors hover:text-foreground disabled:opacity-40"
            aria-label="Skip this contact"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          <p className="type-editorial mb-3 text-sm text-muted">
            {isUpdate
              ? "KinSight found details for this person in your note. Confirm to update the right contact:"
              : "KinSight found details for this person in your note. Confirm to create the contact with these fields:"}
          </p>

          {summary.length === 0 ? (
            <p className="type-editorial text-sm text-muted">No field details detected.</p>
          ) : (
            <dl className="flex flex-col gap-2.5">
              {summary.map((line) => (
                <div
                  key={`${line.label}-${line.value}`}
                  className="rounded-lg border border-border bg-card-hover px-3 py-2"
                >
                  <dt className="type-meta">{line.label}</dt>
                  <dd className="type-editorial mt-0.5 text-sm text-foreground">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {error && (
          <p className="px-5 pb-2 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-hotel-border px-5 py-4">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSaving}
            className="
              flex-1 ui-btn-secondary px-4 py-3 text-sm
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="
              flex flex-1 items-center justify-center gap-2 ui-btn-orange px-4 py-3 text-sm
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : isUpdate ? (
              <Check className="h-4 w-4" strokeWidth={2} />
            ) : (
              <UserPlus className="h-4 w-4" strokeWidth={2} />
            )}
            {isSaving
              ? "Saving…"
              : isUpdate
                ? "Save Updates"
                : "Create Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
