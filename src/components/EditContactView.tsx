"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import {
  ContactPhotoUpload,
  type ContactPhotoActions,
} from "@/components/ContactPhotoUpload";
import { EditContactDeleteProvider } from "@/components/EditContactDeleteContext";
import { DeleteContactConfirmModal } from "@/components/DeleteContactConfirmModal";
import { EditContactFactsGroup } from "@/components/EditContactFactsGroup";
import { EditContactInterestGroup } from "@/components/EditContactInterestGroup";
import { EditContactSection } from "@/components/EditContactSection";
import { EditContactLabeledGroup } from "@/components/EditContactLabeledGroup";
import { EditContactUrlGroup } from "@/components/EditContactUrlGroup";
import { EditContactRelatedGroup } from "@/components/EditContactRelatedGroup";
import {
  EditContactNameRow,
  EditContactRelationshipRow,
} from "@/components/EditContactIdentityRows";
import {
  EditContactKinSightTriggers,
  createAnniversaryEntry,
  createBirthdayEntry,
} from "@/components/EditContactKinSightTriggers";
import {
  buildEditContactFieldState,
  type EditContactFieldState,
} from "@/lib/contacts/labeled-contact-fields";
import { snapshotsEqual } from "@/lib/forms/compare-snapshots";
import { saveEditContact } from "@/lib/contacts/edit-contact-save";
import { deleteContactById } from "@/lib/contacts/delete-contact";
import { imageBlobFromClipboardEvent } from "@/lib/contacts/avatar-crop";
import { useContacts } from "@/hooks/useContacts";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  loadContactSortPreference,
  type ContactSortField,
} from "@/lib/contacts/sort-contacts";
import { MeetingModalSaveButton } from "@/components/agenda/MeetingModalSaveButton";
import { DiscardChangesConfirmModal } from "@/components/DiscardChangesConfirmModal";

interface EditContactViewProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function EditContactView({
  contact,
  onContactUpdate,
}: EditContactViewProps) {
  const router = useRouter();
  const { removeContact } = useContacts();
  const photoActionsRef = useRef<ContactPhotoActions | null>(null);
  const initialStateRef = useRef<EditContactFieldState>(
    buildEditContactFieldState(contact.profile ?? {})
  );
  const [sortBy, setSortBy] = useState<ContactSortField>("first");
  const [state, setState] = useState<EditContactFieldState>(() =>
    buildEditContactFieldState(contact.profile ?? {})
  );
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = useMemo(
    () => !snapshotsEqual(state, initialStateRef.current),
    [state]
  );

  useEffect(() => {
    setSortBy(loadContactSortPreference());
  }, []);

  useEffect(() => {
    const next = buildEditContactFieldState(contact.profile ?? {});
    setState(next);
    initialStateRef.current = next;
  }, [contact.id, contact.profile]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const blob = imageBlobFromClipboardEvent(event);
      if (!blob || !photoActionsRef.current) return;
      event.preventDefault();
      photoActionsRef.current.openCropWithBlob(blob);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const patchState = (patch: Partial<EditContactFieldState>) => {
    setState((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const navigateAway = () => {
    setDiscardPromptOpen(false);
    router.push(`/contacts/${contact.id}`);
  };

  const handleCancel = () => {
    if (isSaving) return;

    if (hasChanges) {
      setDiscardPromptOpen(true);
      return;
    }

    navigateAway();
  };

  const handleDiscardChanges = () => {
    if (isSaving) return;
    navigateAway();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveEditContact(contact, state, {
        notesContent: state.notesDraft,
      });

      if (!result.contact) {
        setError(result.error ?? "Could not save contact.");
        return;
      }

      onContactUpdate?.(result.contact);
      router.push(`/contacts/${contact.id}`);
    } catch {
      setError("Could not save contact. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteContactById(contact.id);

      if (!result.success) {
        setDeleteError(result.error ?? "Could not delete contact.");
        return;
      }

      removeContact(contact.id);
      setDeleteModalOpen(false);
      showSuccessToast("Contact deleted");
      router.push("/contacts");
      router.refresh();
    } catch {
      setDeleteError("Could not delete contact. Check your connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="edit-contact-page">
      <header className="edit-contact-page__nav" aria-label="Edit contact actions">
        <button
          type="button"
          className="edit-contact-header__btn edit-contact-header__btn--cancel"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <MeetingModalSaveButton
          onClick={() => void handleSave()}
          isDirty={hasChanges}
          isSaving={isSaving}
          savingLabel="Saving contact"
          saveLabel="Save contact"
        />
      </header>

      <EditContactDeleteProvider>
        <div className="edit-contact-body">
        <ContactPhotoUpload
          contact={contact}
          sortBy={sortBy}
          variant="edit"
          onContactUpdate={onContactUpdate}
          onEditReady={(actions) => {
            photoActionsRef.current = actions;
          }}
        />

        <section className="edit-contact-group">
          <div className="edit-contact-group__card">
            <EditContactNameRow
              label="First name"
              value={state.firstName}
              onChange={(firstName) => patchState({ firstName })}
            />
            <EditContactNameRow
              label="Last name"
              value={state.lastName}
              onChange={(lastName) => patchState({ lastName })}
            />
            <EditContactRelationshipRow
              label="Relationship"
              value={state.relationship}
              onChange={(relationship) => patchState({ relationship })}
            />
            <EditContactNameRow
              label="Company"
              value={state.companyName}
              onChange={(companyName) => patchState({ companyName })}
              isLast
            />
          </div>
        </section>

        <EditContactSection title="Phone numbers">
          <EditContactLabeledGroup
            group="phone"
            entries={state.phones}
            onChange={(phones) => patchState({ phones })}
            addLabel="add phone"
            placeholder="Phone"
            inputType="tel"
          />
        </EditContactSection>

        <EditContactSection title="Emails">
          <EditContactLabeledGroup
            group="email"
            entries={state.emails}
            onChange={(emails) => patchState({ emails })}
            addLabel="add email"
            placeholder="Email"
            inputType="email"
          />
        </EditContactSection>

        <EditContactSection title="Interests">
          <EditContactInterestGroup
            entries={state.interests}
            onChange={(interests) => patchState({ interests })}
          />
        </EditContactSection>

        <EditContactSection title="Family & relationships">
          <EditContactRelatedGroup
            entries={state.related}
            onChange={(related) => patchState({ related })}
          />
        </EditContactSection>

        <EditContactSection title="Important dates">
          {state.dates.length === 0 ? (
            <EditContactKinSightTriggers
              grouped
              items={[
                {
                  id: "birthday",
                  label: "add birthday",
                  onClick: () =>
                    patchState({ dates: [...state.dates, createBirthdayEntry()] }),
                },
                {
                  id: "date",
                  label: "add date",
                  onClick: () =>
                    patchState({
                      dates: [...state.dates, createAnniversaryEntry()],
                    }),
                },
              ]}
            />
          ) : (
            <EditContactLabeledGroup
              group="date"
              entries={state.dates}
              onChange={(dates) => patchState({ dates })}
              addLabel="add date"
              placeholder="MM-DD-YYYY"
              inputType="date"
            />
          )}
        </EditContactSection>

        <EditContactSection title="Facts & notes">
          <EditContactFactsGroup
            facts={state.facts}
            onChange={(facts) => patchState({ facts })}
          />
        </EditContactSection>

        <EditContactSection title="Websites / links">
          <EditContactUrlGroup
            entries={state.urls}
            onChange={(urls) => patchState({ urls })}
          />
        </EditContactSection>

        <EditContactSection title="Addresses">
          <EditContactLabeledGroup
            group="address"
            entries={state.addresses}
            onChange={(addresses) => patchState({ addresses })}
            addLabel="add address"
            placeholder="Address"
          />
        </EditContactSection>

        <section className="edit-contact-group">
          <div className="edit-contact-group__card edit-contact-notes-card">
            <button
              type="button"
              className="edit-contact-notes-card__toggle"
              onClick={() => setNotesExpanded((open) => !open)}
              aria-expanded={notesExpanded}
            >
              <span>Notes</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  notesExpanded ? "rotate-180" : ""
                }`}
                strokeWidth={2}
              />
            </button>
            {notesExpanded && (
              <div className="edit-contact-notes-card__body">
                <textarea
                  value={state.notesDraft}
                  onChange={(event) =>
                    patchState({ notesDraft: event.target.value })
                  }
                  rows={5}
                  placeholder="Add a note for KinSight activity history…"
                  className="edit-contact-notes-card__textarea"
                />
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 mb-12 flex justify-center px-1">
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
            disabled={isSaving || isDeleting}
            className="w-full rounded-2xl bg-red-600 px-4 py-3.5 text-center text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Contact
          </button>
        </div>

        {error && (
          <p className="edit-contact-error" role="alert">
            {error}
          </p>
        )}
        </div>
      </EditContactDeleteProvider>

      {deleteModalOpen ? (
        <DeleteContactConfirmModal
          firstName={state.firstName}
          lastName={state.lastName}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={() => {
            if (!isDeleting) {
              setDeleteModalOpen(false);
              setDeleteError(null);
            }
          }}
          onConfirm={() => void handleDeleteConfirm()}
        />
      ) : null}

      {discardPromptOpen ? (
        <DiscardChangesConfirmModal
          message="Are you sure you want to discard these contact changes?"
          onCancel={() => setDiscardPromptOpen(false)}
          onDiscard={handleDiscardChanges}
        />
      ) : null}
    </div>
  );
}
