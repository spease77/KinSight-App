"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";
import { readApiJson } from "@/lib/api/read-json";
import { persistContactProfile } from "@/lib/contacts/contact-quick-add-persist";
import {
  getDefaultRelationshipTypeForPrompt,
  getQuickAddPrompt,
  isFamilyRelationshipType,
  isRelationshipQuickAddPrompt,
  type QuickAddPromptId,
} from "@/lib/contacts/contact-quick-add";
import {
  createEmptyRelationshipEntry,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
  serializeRelationshipTree,
  validateRelationshipEntry,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";
import { RelationshipTypeSelect } from "@/components/RelationshipTypeSelect";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { mergeProfileSectionForSave } from "@/types/contact-profile";
import {
  CustomFieldQuickAddForm,
  EducationQuickAddForm,
  MilitaryQuickAddForm,
  ProfileNarrativeQuickAddForm,
  SocialHandleQuickAddForm,
} from "@/components/contact-quick-add-forms";

interface ContactQuickAddDrawerProps {
  open: boolean;
  promptId: QuickAddPromptId | null;
  contact: ContactDetail;
  onClose: () => void;
  onContactUpdate?: (contact: ContactDetail) => void;
}

function RelationshipQuickAddForm({
  contact,
  promptId,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  promptId: QuickAddPromptId;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const [entry, setEntry] = useState<RelationshipTreeEntry>(() => ({
    ...createEmptyRelationshipEntry(),
    relationshipType: getDefaultRelationshipTypeForPrompt(promptId),
  }));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    if (
      promptId === "family" &&
      entry.relationshipType &&
      !isFamilyRelationshipType(entry.relationshipType)
    ) {
      setError("Choose a family relationship type.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const profile = contact.profile ?? {};
      const existing = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
      const nextProfile: ContactProfile = {
        ...profile,
        [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree([
          ...existing,
          entry,
        ]),
      };

      const result = await persistContactProfile(contact.id, nextProfile);
      if (!result.contact) {
        setError(result.error ?? "Could not save connection.");
        return;
      }

      onSaved(result.contact);
    } catch {
      setError("Could not save connection. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <RelationshipTypeSelect
        value={entry.relationshipType}
        onChange={(relationshipType) => update({ relationshipType })}
        label="Relationship"
      />

      <div className="contact-quick-add-drawer__grid">
        <label className="contact-quick-add-drawer__field">
          <span className="ui-label">First name</span>
          <input
            type="text"
            value={entry.firstName}
            onChange={(event) => update({ firstName: event.target.value })}
            className="ui-input w-full py-2.5 text-sm"
            placeholder="First name"
          />
        </label>
        <label className="contact-quick-add-drawer__field">
          <span className="ui-label">Last name</span>
          <input
            type="text"
            value={entry.lastName}
            onChange={(event) => update({ lastName: event.target.value })}
            className="ui-input w-full py-2.5 text-sm"
            placeholder="Last name"
          />
        </label>
      </div>

      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Phone</span>
        <PhoneNumberInput
          value={entry.phone ?? ""}
          onChange={(e164) => update({ phone: e164 })}
          variant="field"
          placeholder="Optional"
        />
      </label>

      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Email</span>
        <input
          type="email"
          value={entry.email ?? ""}
          onChange={(event) => update({ email: event.target.value })}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="Optional"
        />
      </label>

      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}

      <div className="contact-quick-add-drawer__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="ui-btn-outline px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="ui-btn-primary px-4 py-2.5 text-sm"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function InterestQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const [value, setValue] = useState(savedProfile.hobbiesRecreation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Describe an interest or hobby.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const draft: ContactProfile = {
        ...savedProfile,
        hobbiesRecreation: trimmed,
      };
      const merged = mergeProfileSectionForSave(
        savedProfile,
        draft,
        "lifestyleAndHealth"
      );

      const result = await persistContactProfile(contact.id, merged);
      if (!result.contact) {
        setError(result.error ?? "Could not save interest.");
        return;
      }

      onSaved(result.contact);
    } catch {
      setError("Could not save interest. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Interests & hobbies</span>
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          rows={5}
          className="ui-input w-full resize-y py-2.5 text-sm"
          placeholder="e.g. Skiing, craft beer, Yankees fan…"
        />
      </label>

      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}

      <div className="contact-quick-add-drawer__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="ui-btn-outline px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="ui-btn-primary px-4 py-2.5 text-sm"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function NoteQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Write a note before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contact.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await readApiJson<{ contact?: ContactDetail; error?: string }>(
        res
      );

      if (!res.ok || !data.contact) {
        setError(data.error ?? "Could not save note.");
        return;
      }

      onSaved(data.contact);
    } catch {
      setError("Could not save note. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Note</span>
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          rows={5}
          className="ui-input w-full resize-y py-2.5 text-sm"
          placeholder="What did you learn or want to remember?"
        />
      </label>

      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}

      <div className="contact-quick-add-drawer__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="ui-btn-outline px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="ui-btn-primary px-4 py-2.5 text-sm"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function ContactQuickAddDrawer({
  open,
  promptId,
  contact,
  onClose,
  onContactUpdate,
}: ContactQuickAddDrawerProps) {
  const [entered, setEntered] = useState(false);

  const prompt = useMemo(
    () => (promptId ? getQuickAddPrompt(promptId) : undefined),
    [promptId]
  );

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !prompt || !promptId) return null;

  const handleSaved = (updated: ContactDetail) => {
    onContactUpdate?.(updated);
    onClose();
  };

  return (
    <div
      className={`contact-quick-add-drawer__overlay ${
        entered ? "contact-quick-add-drawer__overlay--open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-quick-add-title"
      onClick={onClose}
    >
      <div
        className={`contact-quick-add-drawer__sheet ${
          entered ? "contact-quick-add-drawer__sheet--open" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contact-quick-add-drawer__header">
          <button
            type="button"
            onClick={onClose}
            className="contact-quick-add-drawer__header-btn"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2
              id="contact-quick-add-title"
              className="font-sans text-[17px] font-semibold tracking-tight text-foreground"
            >
              {prompt.drawerTitle}
            </h2>
            {prompt.drawerHint && (
              <p className="mt-0.5 text-xs text-muted">{prompt.drawerHint}</p>
            )}
          </div>
          <div className="contact-quick-add-drawer__header-btn" aria-hidden>
            <Check className="h-5 w-5 opacity-0" strokeWidth={2.25} />
          </div>
        </header>

        <div className="contact-quick-add-drawer__body contacts-scroll">
          {isRelationshipQuickAddPrompt(promptId) && (
            <RelationshipQuickAddForm
              contact={contact}
              promptId={promptId}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "interest" && (
            <InterestQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "religion" && (
            <ProfileNarrativeQuickAddForm
              contact={contact}
              sectionId="clubsAndService"
              fieldKey="religion"
              fieldLabel="Religion / faith"
              placeholder="Affiliation, participation, sensitivities…"
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "education" && (
            <EducationQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "military" && (
            <MilitaryQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "club" && (
            <ProfileNarrativeQuickAddForm
              contact={contact}
              sectionId="clubsAndService"
              fieldKey="professionalServiceClubs"
              fieldLabel="Club / organization"
              placeholder="Rotary, Masons, alumni groups, charities…"
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "businessBackground" && (
            <ProfileNarrativeQuickAddForm
              contact={contact}
              sectionId="businessBackground"
              fieldKey="businessOperations"
              fieldLabel="Business background"
              placeholder="What their company does, role, career path…"
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "socialHandle" && (
            <SocialHandleQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "note" && (
            <NoteQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
          {promptId === "customField" && (
            <CustomFieldQuickAddForm
              contact={contact}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
