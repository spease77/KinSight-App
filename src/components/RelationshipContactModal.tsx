"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CONTACT_DATE_PLACEHOLDER } from "@/lib/dates/contact-dates";
import {
  GATEKEEPER_CONTACT_METHODS,
  getRelationshipFieldSet,
  INFLUENCE_LEVEL_OPTIONS,
  showsAnniversaryField,
  validateRelationshipEntry,
  type RelationshipTreeEntry,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";
import { RelationshipTypeSelect } from "@/components/RelationshipTypeSelect";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";

interface RelationshipContactModalProps {
  entry: RelationshipTreeEntry;
  isNew: boolean;
  onClose: () => void;
  onSave: (entry: RelationshipTreeEntry) => void | Promise<void>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="ui-label">{children}</span>;
}

export function RelationshipContactModal({
  entry: initialEntry,
  isNew,
  onClose,
  onSave,
}: RelationshipContactModalProps) {
  const [entry, setEntry] = useState<RelationshipTreeEntry>(initialEntry);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEntry(initialEntry);
    setError(null);
  }, [initialEntry]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const fieldSet = getRelationshipFieldSet(entry.relationshipType);
  const hasType = Boolean(entry.relationshipType);

  const update = (patch: Partial<RelationshipTreeEntry>) => {
    setEntry((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const handleSave = async () => {
    const validationError = validateRelationshipEntry(entry);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(entry);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save related contact. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relationship-contact-title"
      onClick={onClose}
    >
      <div
        className="ui-card flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="type-meta">Relationship Tree</p>
            <h2
              id="relationship-contact-title"
              className="mt-1 font-sans text-lg font-normal tracking-tight text-foreground"
            >
              {isNew ? "Add Related Contact" : "Edit Related Contact"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <RelationshipTypeSelect
              value={entry.relationshipType}
              onChange={(relationshipType) => update({ relationshipType })}
            />

            {hasType && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>First name *</FieldLabel>
                    <input
                      type="text"
                      value={entry.firstName}
                      onChange={(event) =>
                        update({ firstName: event.target.value })
                      }
                      className="ui-input w-full py-2.5 text-sm"
                      autoFocus
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>Last name *</FieldLabel>
                    <input
                      type="text"
                      value={entry.lastName}
                      onChange={(event) =>
                        update({ lastName: event.target.value })
                      }
                      className="ui-input w-full py-2.5 text-sm"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>Email</FieldLabel>
                    <input
                      type="email"
                      value={entry.email ?? ""}
                      onChange={(event) => update({ email: event.target.value })}
                      className="ui-input w-full py-2.5 text-sm"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>Phone</FieldLabel>
                    <PhoneNumberInput
                      value={entry.phone ?? ""}
                      onChange={(e164) => update({ phone: e164 })}
                      variant="field"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                {fieldSet === "inner_circle" && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Birthday</FieldLabel>
                      <input
                        type="text"
                        value={entry.birthday ?? ""}
                        onChange={(event) =>
                          update({ birthday: event.target.value })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                        placeholder={CONTACT_DATE_PLACEHOLDER}
                      />
                    </label>

                    {showsAnniversaryField(entry.relationshipType) && (
                      <label className="flex flex-col gap-1.5">
                        <FieldLabel>Anniversary</FieldLabel>
                        <input
                          type="text"
                          value={entry.anniversary ?? ""}
                          onChange={(event) =>
                            update({ anniversary: event.target.value })
                          }
                          className="ui-input w-full py-2.5 text-sm"
                          placeholder={CONTACT_DATE_PLACEHOLDER}
                        />
                      </label>
                    )}

                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Influence level</FieldLabel>
                      <select
                        value={entry.influenceLevel ?? ""}
                        onChange={(event) =>
                          update({
                            influenceLevel: event.target
                              .value as RelationshipTreeEntry["influenceLevel"],
                          })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                      >
                        <option value="">Select level…</option>
                        {INFLUENCE_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Personal notes</FieldLabel>
                      <textarea
                        value={entry.notes ?? ""}
                        onChange={(event) =>
                          update({ notes: event.target.value })
                        }
                        rows={3}
                        className="ui-input w-full resize-y py-2.5 text-sm"
                        placeholder='e.g. "Huge Dallas Cowboys fan," "Enjoys fly fishing"'
                      />
                    </label>
                  </>
                )}

                {fieldSet === "professional" && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Company name</FieldLabel>
                      <input
                        type="text"
                        value={entry.company ?? ""}
                        onChange={(event) =>
                          update({ company: event.target.value })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Job title</FieldLabel>
                      <input
                        type="text"
                        value={entry.jobTitle ?? ""}
                        onChange={(event) =>
                          update({ jobTitle: event.target.value })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Influence level</FieldLabel>
                      <select
                        value={entry.influenceLevel ?? ""}
                        onChange={(event) =>
                          update({
                            influenceLevel: event.target
                              .value as RelationshipTreeEntry["influenceLevel"],
                          })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                      >
                        <option value="">Select level…</option>
                        {INFLUENCE_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Professional context / notes</FieldLabel>
                      <textarea
                        value={entry.notes ?? ""}
                        onChange={(event) =>
                          update({ notes: event.target.value })
                        }
                        rows={3}
                        className="ui-input w-full resize-y py-2.5 text-sm"
                        placeholder='e.g. "Met at the charity gala"'
                      />
                    </label>
                  </>
                )}

                {fieldSet === "gatekeeper" && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Preferred contact method</FieldLabel>
                      <select
                        value={entry.preferredContactMethod ?? ""}
                        onChange={(event) =>
                          update({ preferredContactMethod: event.target.value })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                      >
                        <option value="">Select method…</option>
                        {GATEKEEPER_CONTACT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Best time to call</FieldLabel>
                      <input
                        type="text"
                        value={entry.bestTimeToCall ?? ""}
                        onChange={(event) =>
                          update({ bestTimeToCall: event.target.value })
                        }
                        className="ui-input w-full py-2.5 text-sm"
                        placeholder="e.g. Mornings before 10 AM"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <FieldLabel>Notes</FieldLabel>
                      <textarea
                        value={entry.notes ?? ""}
                        onChange={(event) =>
                          update({ notes: event.target.value })
                        }
                        rows={3}
                        className="ui-input w-full resize-y py-2.5 text-sm"
                        placeholder="Rapport details with the gatekeeper…"
                      />
                    </label>
                  </>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="ui-btn-outline-green px-4 py-2.5 text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!hasType || isSaving}
            className="ui-btn-primary px-4 py-2.5 text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? "Saving…"
              : isNew
                ? "Add contact"
                : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
