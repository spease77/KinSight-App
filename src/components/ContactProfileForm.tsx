"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";
import type { ContactSourceMetadata } from "@/types/source-metadata";
import {
  ensureProfileNameFromContact,
  isProfileSectionDirty,
  mergeLinkedInEnrichmentForSave,
  mergeProfileSectionForSave,
  revertProfileSection,
} from "@/types/contact-profile";
import {
  inferContactTypeFromRelationshipType,
  readPrimaryRelationshipTypeFromProfile,
} from "@/lib/contacts/relationship-tree";
import { ProfileSectionsEditor } from "@/components/ProfileSectionsEditor";
import type { SocialMediaPersistOptions } from "@/components/SocialMediaSection";

interface ContactProfileFormProps {
  contactId: string;
  contactName: string;
  initialProfile?: ContactProfile;
  sourceMetadata?: ContactSourceMetadata;
  onSaved?: (contact: ContactDetail) => void;
}

type SectionStatus = {
  error?: string;
  message?: string;
};

export function ContactProfileForm({
  contactId,
  contactName,
  initialProfile = {},
  sourceMetadata,
  onSaved,
}: ContactProfileFormProps) {
  const resolvedProfile = useMemo(
    () => ensureProfileNameFromContact(initialProfile, contactName),
    [initialProfile, contactName]
  );
  const [profile, setProfile] = useState<ContactProfile>(resolvedProfile);
  const [savedProfile, setSavedProfile] = useState<ContactProfile>(resolvedProfile);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [sectionStatus, setSectionStatus] = useState<Record<string, SectionStatus>>(
    {}
  );

  useEffect(() => {
    const next = ensureProfileNameFromContact(initialProfile, contactName);
    setProfile(next);
    setSavedProfile(next);
    setSectionStatus({});
    setOpenSections({});
  }, [contactId, contactName, initialProfile]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleCancelSection = useCallback(
    (sectionId: string) => {
      setProfile((current) => revertProfileSection(current, savedProfile, sectionId));
      setSectionStatus((prev) => ({ ...prev, [sectionId]: {} }));
    },
    [savedProfile]
  );

  const persistProfileSection = useCallback(
    async (
      sectionId: string,
      draftProfile: ContactProfile,
      mergedOverride?: ContactProfile
    ): Promise<{ ok: boolean; error?: string }> => {
      setSavingSectionId(sectionId);
      setSectionStatus((prev) => ({ ...prev, [sectionId]: {} }));

      try {
        const mergedProfile =
          mergedOverride ??
          mergeProfileSectionForSave(savedProfile, draftProfile, sectionId);

        const relationshipType = readPrimaryRelationshipTypeFromProfile(mergedProfile);
        const patchBody: {
          profile: ContactProfile;
          contactType?: ReturnType<typeof inferContactTypeFromRelationshipType>;
          contactTypeNeedsConfirmation?: boolean;
        } = { profile: mergedProfile };

        if (sectionId === "customerInfo" && relationshipType) {
          patchBody.contactType =
            inferContactTypeFromRelationshipType(relationshipType);
          patchBody.contactTypeNeedsConfirmation = false;
        }

        const res = await fetch(`/api/contacts/${contactId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });

        const data = (await res.json()) as {
          error?: string;
          contact?: ContactDetail;
        };

        if (!res.ok) {
          const error = data.error ?? "Could not save this section.";
          setSectionStatus((prev) => ({
            ...prev,
            [sectionId]: { error },
          }));
          return { ok: false, error };
        }

        const savedContact = data.contact;
        if (savedContact?.profile) {
          const next = ensureProfileNameFromContact(
            savedContact.profile,
            contactName
          );
          setSavedProfile(next);
          setProfile(next);
        }

        if (sectionId !== "relationshipTree" && sectionId !== "socialMedia") {
          setSectionStatus((prev) => ({
            ...prev,
            [sectionId]: { message: "Saved" },
          }));
        }

        if (savedContact) {
          onSaved?.(savedContact);
        }

        return { ok: true };
      } catch {
        const error = "Could not save this section. Check your connection.";
        setSectionStatus((prev) => ({
          ...prev,
          [sectionId]: { error },
        }));
        return { ok: false, error };
      } finally {
        setSavingSectionId(null);
      }
    },
    [contactId, contactName, onSaved, savedProfile]
  );

  const handleSaveSection = useCallback(
    async (sectionId: string) => {
      await persistProfileSection(sectionId, profile);
    },
    [profile, persistProfileSection]
  );

  const persistRelationshipTree = useCallback(
    async (nextProfile: ContactProfile) => {
      return persistProfileSection("relationshipTree", nextProfile);
    },
    [persistProfileSection]
  );

  const persistSocialMedia = useCallback(
    async (
      nextProfile: ContactProfile,
      options?: SocialMediaPersistOptions
    ) => {
      const merged = options?.linkedInEnriched
        ? mergeLinkedInEnrichmentForSave(savedProfile, nextProfile)
        : undefined;

      return persistProfileSection("socialMedia", nextProfile, merged);
    },
    [persistProfileSection]
  );

  const isSectionDirty = useCallback(
    (sectionId: string) => isProfileSectionDirty(profile, savedProfile, sectionId),
    [profile, savedProfile]
  );

  return (
    <ProfileSectionsEditor
      profile={profile}
      onChange={setProfile}
      openSections={openSections}
      onToggleSection={toggleSection}
      contactId={contactId}
      contactName={contactName}
      sourceMetadata={sourceMetadata}
      savingSectionId={savingSectionId}
      sectionStatus={sectionStatus}
      isSectionDirty={isSectionDirty}
      onSaveSection={handleSaveSection}
      onCancelSection={handleCancelSection}
      onPersistRelationshipTree={persistRelationshipTree}
      onPersistSocialMedia={persistSocialMedia}
      lockedName={{
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
      }}
    />
  );
}
