"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  AddContactPhotoSection,
  type AddContactPhotoActions,
} from "@/components/AddContactPhotoSection";
import { EditContactDeleteProvider } from "@/components/EditContactDeleteContext";
import { EditContactFactsGroup } from "@/components/EditContactFactsGroup";
import {
  EditContactNameRow,
  EditContactRelationshipRow,
} from "@/components/EditContactIdentityRows";
import { EditContactInterestGroup } from "@/components/EditContactInterestGroup";
import { EditContactLabeledGroup } from "@/components/EditContactLabeledGroup";
import { EditContactRelatedGroup } from "@/components/EditContactRelatedGroup";
import { EditContactSection } from "@/components/EditContactSection";
import { EditContactUrlGroup } from "@/components/EditContactUrlGroup";
import {
  EditContactKinSightTriggers,
  createAnniversaryEntry,
  createBirthdayEntry,
} from "@/components/EditContactKinSightTriggers";
import { saveNewContact } from "@/lib/contacts/add-contact-save";
import { imageBlobFromClipboardEvent } from "@/lib/contacts/avatar-crop";
import {
  buildEditContactFieldState,
  type EditContactFieldState,
} from "@/lib/contacts/labeled-contact-fields";
import {
  loadContactSortPreference,
  type ContactSortField,
} from "@/lib/contacts/sort-contacts";
import { useContacts } from "@/hooks/useContacts";

export function AddContactView() {
  const router = useRouter();
  const { upsertContact, reload } = useContacts();
  const photoActionsRef = useRef<AddContactPhotoActions | null>(null);
  const [sortBy, setSortBy] = useState<ContactSortField>("first");
  const [state, setState] = useState<EditContactFieldState>(() =>
    buildEditContactFieldState({})
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSortBy(loadContactSortPreference());
  }, []);

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

  const handleCancel = () => {
    router.push("/contacts");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveNewContact(state, {
        avatarBlob: photoActionsRef.current?.getPendingBlob() ?? null,
      });

      if (!result.contact) {
        setError(result.error ?? "Could not create contact.");
        return;
      }

      upsertContact(result.contact);
      await reload();
      router.refresh();
      router.push(`/contacts/${result.contact.id}`);
    } catch {
      setError("Could not create contact. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-contact-page">
      <header className="edit-contact-page__nav" aria-label="Add contact actions">
        <button
          type="button"
          className="edit-contact-header__btn edit-contact-header__btn--cancel"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className="edit-contact-header__btn edit-contact-header__btn--save"
          onClick={() => void handleSave()}
          disabled={isSaving}
          aria-label="Save"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
          ) : (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          )}
        </button>
      </header>

      <EditContactDeleteProvider>
        <div className="edit-contact-body">
          <AddContactPhotoSection
            firstName={state.firstName}
            lastName={state.lastName}
            sortBy={sortBy}
            onReady={(actions) => {
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

          <EditContactSection>
            <EditContactLabeledGroup
              group="phone"
              entries={state.phones}
              onChange={(phones) => patchState({ phones })}
              addLabel="add phone"
              placeholder="Phone"
              inputType="tel"
            />
          </EditContactSection>

          <EditContactSection>
            <EditContactLabeledGroup
              group="email"
              entries={state.emails}
              onChange={(emails) => patchState({ emails })}
              addLabel="add email"
              placeholder="Email"
              inputType="email"
            />
          </EditContactSection>

          <EditContactSection>
            <EditContactInterestGroup
              entries={state.interests}
              onChange={(interests) => patchState({ interests })}
            />
          </EditContactSection>

          <EditContactSection>
            <EditContactRelatedGroup
              entries={state.related}
              onChange={(related) => patchState({ related })}
            />
          </EditContactSection>

          <EditContactSection>
            {state.dates.length === 0 ? (
              <EditContactKinSightTriggers
                grouped
                items={[
                  {
                    id: "birthday",
                    label: "add birthday",
                    onClick: () =>
                      patchState({
                        dates: [...state.dates, createBirthdayEntry()],
                      }),
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

          <EditContactSection>
            <EditContactFactsGroup
              facts={state.facts}
              onChange={(facts) => patchState({ facts })}
            />
          </EditContactSection>

          <EditContactSection>
            <EditContactUrlGroup
              entries={state.urls}
              onChange={(urls) => patchState({ urls })}
            />
          </EditContactSection>

          <EditContactSection>
            <EditContactLabeledGroup
              group="address"
              entries={state.addresses}
              onChange={(addresses) => patchState({ addresses })}
              addLabel="add address"
              placeholder="Address"
            />
          </EditContactSection>

          {error && (
            <p className="edit-contact-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </EditContactDeleteProvider>
    </div>
  );
}
