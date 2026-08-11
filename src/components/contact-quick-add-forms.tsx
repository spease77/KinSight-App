"use client";

import { useMemo, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfile, ContactProfileFieldKey } from "@/types/contact-profile";
import {
  getAllProfileFieldsInContext,
  mergeProfileSectionForSave,
  profileFieldExportLabel,
} from "@/types/contact-profile";
import { persistContactProfile } from "@/lib/contacts/contact-quick-add-persist";
import {
  createEmptySocialMediaEntry,
  KINSIGHT_SOCIAL_MEDIA_KEY,
  normalizeSocialMediaUrl,
  parseSocialMedia,
  serializeSocialMedia,
} from "@/lib/contacts/social-media";

function QuickAddFormActions({
  onCancel,
  onSave,
  isSaving,
  saveLabel = "Save",
}: {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel?: string;
}) {
  return (
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
        onClick={onSave}
        disabled={isSaving}
        className="ui-btn-primary px-4 py-2.5 text-sm"
      >
        {isSaving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function ProfileNarrativeQuickAddForm({
  contact,
  sectionId,
  fieldKey,
  fieldLabel,
  placeholder,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  sectionId: string;
  fieldKey: ContactProfileFieldKey;
  fieldLabel: string;
  placeholder: string;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const [value, setValue] = useState(savedProfile[fieldKey] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter details before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const draft: ContactProfile = { ...savedProfile, [fieldKey]: trimmed };
      const merged = mergeProfileSectionForSave(
        savedProfile,
        draft,
        sectionId
      );
      const result = await persistContactProfile(contact.id, merged);
      if (!result.contact) {
        setError(result.error ?? "Could not save.");
        return;
      }
      onSaved(result.contact);
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">{fieldLabel}</span>
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          rows={5}
          className="ui-input w-full resize-y py-2.5 text-sm"
          placeholder={placeholder}
        />
      </label>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <QuickAddFormActions
        onCancel={onCancel}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />
    </div>
  );
}

export function EducationQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const [highSchool, setHighSchool] = useState(savedProfile.highSchool ?? "");
  const [college, setCollege] = useState(savedProfile.college ?? "");
  const [degree, setDegree] = useState(savedProfile.collegeDegree ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!highSchool.trim() && !college.trim() && !degree.trim()) {
      setError("Enter at least one education detail.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const draft: ContactProfile = {
        ...savedProfile,
        ...(highSchool.trim() ? { highSchool: highSchool.trim() } : {}),
        ...(college.trim() ? { college: college.trim() } : {}),
        ...(degree.trim() ? { collegeDegree: degree.trim() } : {}),
      };
      const merged = mergeProfileSectionForSave(
        savedProfile,
        draft,
        "education"
      );
      const result = await persistContactProfile(contact.id, merged);
      if (!result.contact) {
        setError(result.error ?? "Could not save education.");
        return;
      }
      onSaved(result.contact);
    } catch {
      setError("Could not save education. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">High school</span>
        <input
          type="text"
          value={highSchool}
          onChange={(event) => setHighSchool(event.target.value)}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="School name"
        />
      </label>
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">College / university</span>
        <input
          type="text"
          value={college}
          onChange={(event) => setCollege(event.target.value)}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="Institution name"
        />
      </label>
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Degree / major</span>
        <input
          type="text"
          value={degree}
          onChange={(event) => setDegree(event.target.value)}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="e.g. BS Finance"
        />
      </label>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <QuickAddFormActions
        onCancel={onCancel}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />
    </div>
  );
}

export function MilitaryQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const [branch, setBranch] = useState(savedProfile.militaryBranch ?? "");
  const [rank, setRank] = useState(savedProfile.militaryRankAtDischarge ?? "");
  const [years, setYears] = useState(savedProfile.militaryServiceYears ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!branch.trim()) {
      setError("Enter a military branch.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const draft: ContactProfile = {
        ...savedProfile,
        militaryBranch: branch.trim(),
        ...(rank.trim() ? { militaryRankAtDischarge: rank.trim() } : {}),
        ...(years.trim() ? { militaryServiceYears: years.trim() } : {}),
      };
      const merged = mergeProfileSectionForSave(
        savedProfile,
        draft,
        "militaryService"
      );
      const result = await persistContactProfile(contact.id, merged);
      if (!result.contact) {
        setError(result.error ?? "Could not save military service.");
        return;
      }
      onSaved(result.contact);
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Branch</span>
        <input
          type="text"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="Army, Navy, Air Force, etc."
        />
      </label>
      <div className="contact-quick-add-drawer__grid">
        <label className="contact-quick-add-drawer__field">
          <span className="ui-label">Rank at discharge</span>
          <input
            type="text"
            value={rank}
            onChange={(event) => setRank(event.target.value)}
            className="ui-input w-full py-2.5 text-sm"
            placeholder="Optional"
          />
        </label>
        <label className="contact-quick-add-drawer__field">
          <span className="ui-label">Years of service</span>
          <input
            type="text"
            value={years}
            onChange={(event) => setYears(event.target.value)}
            className="ui-input w-full py-2.5 text-sm"
            placeholder="Optional"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <QuickAddFormActions
        onCancel={onCancel}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />
    </div>
  );
}

export function SocialHandleQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const normalizedUrl = normalizeSocialMediaUrl(url);
    if (!normalizedUrl) {
      setError("Enter a valid URL.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const entry = {
        ...createEmptySocialMediaEntry(),
        url: normalizedUrl,
        ...(label.trim() ? { label: label.trim() } : {}),
      };
      const existing = parseSocialMedia(savedProfile[KINSIGHT_SOCIAL_MEDIA_KEY]);
      const nextProfile: ContactProfile = {
        ...savedProfile,
        [KINSIGHT_SOCIAL_MEDIA_KEY]: serializeSocialMedia([...existing, entry]),
      };
      const result = await persistContactProfile(contact.id, nextProfile);
      if (!result.contact) {
        setError(result.error ?? "Could not save social handle.");
        return;
      }
      onSaved(result.contact);
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">URL</span>
        <input
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="linkedin.com/in/… or website"
        />
      </label>
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Label (optional)</span>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="ui-input w-full py-2.5 text-sm"
          placeholder="LinkedIn, Twitter, Website…"
        />
      </label>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <QuickAddFormActions
        onCancel={onCancel}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />
    </div>
  );
}

const META_PROFILE_KEYS = new Set([
  "__kinsightContactType",
  "__kinsightContactTypeNeedsConfirmation",
  "__kinsightRelationshipTree",
  "__kinsightSocialMedia",
  "__kinsightPrimaryRelationshipType",
]);

export function CustomFieldQuickAddForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: ContactDetail;
  onSaved: (contact: ContactDetail) => void;
  onCancel: () => void;
}) {
  const savedProfile = contact.profile ?? {};
  const emptyFields = useMemo(
    () =>
      getAllProfileFieldsInContext().filter((field) => {
        if (META_PROFILE_KEYS.has(field.key)) return false;
        return !savedProfile[field.key]?.trim();
      }),
    [savedProfile]
  );

  const [fieldKey, setFieldKey] = useState(
    emptyFields[0]?.key ?? ""
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedField = emptyFields.find((field) => field.key === fieldKey);

  const handleSave = async () => {
    if (!fieldKey || !selectedField) {
      setError("Choose a field to fill.");
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a value for this field.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const draft: ContactProfile = {
        ...savedProfile,
        [fieldKey]: trimmed,
      };
      const merged = mergeProfileSectionForSave(
        savedProfile,
        draft,
        selectedField.section.id
      );
      const result = await persistContactProfile(contact.id, merged);
      if (!result.contact) {
        setError(result.error ?? "Could not save field.");
        return;
      }
      onSaved(result.contact);
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (emptyFields.length === 0) {
    return (
      <div className="contact-quick-add-drawer__form">
        <p className="text-sm text-muted">
          All standard profile fields are already filled. Use Add Note for free-form
          updates.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="ui-btn-outline px-4 py-2.5 text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="contact-quick-add-drawer__form">
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Field</span>
        <select
          value={fieldKey}
          onChange={(event) => {
            setFieldKey(event.target.value as ContactProfileFieldKey);
            setError(null);
          }}
          className="ui-input w-full py-2.5 text-sm"
        >
          {emptyFields.map((field) => (
            <option key={field.key} value={field.key}>
              {profileFieldExportLabel(field, field.group)}
            </option>
          ))}
        </select>
      </label>
      <label className="contact-quick-add-drawer__field">
        <span className="ui-label">Value</span>
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          rows={4}
          className="ui-input w-full resize-y py-2.5 text-sm"
          placeholder={selectedField?.hint ?? "Enter value"}
        />
      </label>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <QuickAddFormActions
        onCancel={onCancel}
        onSave={() => void handleSave()}
        isSaving={isSaving}
      />
    </div>
  );
}
