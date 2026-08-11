"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  formatRelationshipEntryDisplayName,
  getRelationshipEntryFacts,
  getRelationshipTypeLabel,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";
import { formatStoredPhoneDisplay } from "@/lib/contacts/phone-input";

interface RelatedPersonFactsRowProps {
  entry: RelationshipTreeEntry;
  isLast?: boolean;
  isSaving?: boolean;
  isAddingFact?: boolean;
  showEditActions?: boolean;
  onFactsChange: (entryId: string, facts: string[]) => Promise<void>;
  onStartAddFact?: () => void;
  onCancelAddFact?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  isRemoving?: boolean;
}

function formatFactCount(count: number): string {
  return `${count} fact${count === 1 ? "" : "s"}`;
}

function FactAddForm({
  draftFact,
  error,
  isSaving,
  inputRef,
  onDraftChange,
  onSave,
  onCancel,
}: {
  draftFact: string;
  error: string | null;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="related-person-row__add-form">
        <input
          ref={inputRef}
          type="text"
          value={draftFact}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder="Add a fact…"
          className="related-person-row__add-input"
          disabled={isSaving}
        />
        <button
          type="button"
          className="related-person-row__save-btn"
          onClick={onSave}
          disabled={isSaving}
          aria-label="Save fact"
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="related-person-row__cancel-btn"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      {error && (
        <p className="related-person-row__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function RelatedPersonFactsRow({
  entry,
  isLast = false,
  isSaving = false,
  isAddingFact = false,
  showEditActions = false,
  onFactsChange,
  onStartAddFact,
  onCancelAddFact,
  onEdit,
  onRemove,
  isRemoving = false,
}: RelatedPersonFactsRowProps) {
  const facts = getRelationshipEntryFacts(entry);
  const factCount = facts.length;
  const hasFacts = factCount > 0;

  const [expanded, setExpanded] = useState(false);
  const [draftFact, setDraftFact] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [removingFactIndex, setRemovingFactIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName =
    formatRelationshipEntryDisplayName(entry, "firstName") || "Unnamed contact";
  const typeLabel = getRelationshipTypeLabel(entry.relationshipType);
  const secondary = [
    entry.phone ? formatStoredPhoneDisplay(entry.phone) : "",
    entry.email,
    entry.company,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");

  const showPanel = isAddingFact || (hasFacts && expanded);
  const showRowDivider = !isLast;

  useEffect(() => {
    if (!isAddingFact) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isAddingFact]);

  useEffect(() => {
    if (!isAddingFact) {
      setDraftFact("");
      setLocalError(null);
    }
  }, [isAddingFact]);

  const openAddFact = () => {
    setLocalError(null);
    if (hasFacts) {
      setExpanded(true);
    }
    onStartAddFact?.();
  };

  const closeAddFact = () => {
    setDraftFact("");
    setLocalError(null);
    onCancelAddFact?.();
    if (!hasFacts) {
      setExpanded(false);
    }
  };

  const toggleExpanded = () => {
    if (!hasFacts) return;
    setLocalError(null);
    setExpanded((open) => {
      if (open) {
        onCancelAddFact?.();
      }
      return !open;
    });
  };

  const saveFact = async () => {
    const trimmed = draftFact.trim();
    if (!trimmed) {
      setLocalError("Enter a fact before saving.");
      return;
    }

    setLocalError(null);
    try {
      await onFactsChange(entry.id, [...facts, trimmed]);
      setDraftFact("");
      onCancelAddFact?.();
      if (hasFacts || trimmed) {
        setExpanded(true);
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not save fact."
      );
    }
  };

  const removeFact = async (index: number) => {
    setLocalError(null);
    setRemovingFactIndex(index);
    try {
      const nextFacts = facts.filter((_, factIndex) => factIndex !== index);
      await onFactsChange(entry.id, nextFacts);
      if (nextFacts.length === 0) {
        setExpanded(false);
        onCancelAddFact?.();
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not remove fact."
      );
    } finally {
      setRemovingFactIndex(null);
    }
  };

  return (
    <div
      className={[
        "related-person-row",
        showRowDivider && "related-person-row--border",
        showPanel && hasFacts && "related-person-row--expanded",
        isAddingFact && "related-person-row--adding-fact",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="related-person-row__header">
        <div className="related-person-row__title-row">
          <span className="related-person-row__label">
            {typeLabel || "Connection"}
          </span>

          <div className="related-person-row__header-actions">
            {hasFacts && (
              <button
                type="button"
                className={`related-person-row__facts-toggle ${
                  expanded ? "related-person-row__facts-toggle--open" : ""
                }`}
                onClick={toggleExpanded}
                disabled={isSaving}
                aria-expanded={expanded}
              >
                {formatFactCount(factCount)}
                <ChevronDown
                  className="related-person-row__facts-toggle-chevron"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            )}

            {!isAddingFact && (
              <button
                type="button"
                className="related-person-row__add-fact"
                onClick={openAddFact}
                disabled={isSaving}
              >
                + add fact
              </button>
            )}

            {showEditActions && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={isRemoving || isSaving}
                  className="related-person-row__icon-btn"
                  aria-label={`Edit ${displayName}`}
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={isRemoving || isSaving}
                  className="related-person-row__icon-btn related-person-row__icon-btn--danger"
                  aria-label={`Remove ${displayName}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className="related-person-row__main"
          onClick={toggleExpanded}
          disabled={!hasFacts || isSaving}
          aria-expanded={hasFacts ? expanded : undefined}
        >
          <span className="related-person-row__name">{displayName}</span>
          {secondary && (
            <span className="related-person-row__secondary">{secondary}</span>
          )}
        </button>
      </div>

      {isAddingFact && (
        <div className="related-person-row__add-form-row">
          <FactAddForm
            draftFact={draftFact}
            error={localError}
            isSaving={isSaving}
            inputRef={inputRef}
            onDraftChange={(value) => {
              setDraftFact(value);
              setLocalError(null);
            }}
            onSave={() => void saveFact()}
            onCancel={closeAddFact}
          />
        </div>
      )}

      {showPanel && hasFacts && (
        <div className="related-person-row__panel">
          <ul className="related-person-row__facts-list">
            {facts.map((fact, index) => (
              <li key={`${entry.id}-fact-${index}`} className="related-person-fact">
                <span className="related-person-fact__bullet" aria-hidden>
                  •
                </span>
                <span className="related-person-fact__text">{fact}</span>
                <button
                  type="button"
                  className="related-person-fact__delete"
                  onClick={() => void removeFact(index)}
                  disabled={isSaving || removingFactIndex === index}
                  aria-label={`Remove fact: ${fact}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
