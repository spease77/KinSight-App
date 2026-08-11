"use client";



import { SourceCitation } from "@/components/SourceCitation";
import {
  CONTACT_DATE_PLACEHOLDER,
  contactDateInputValue,
  isContactDateProfileField,
} from "@/lib/dates/contact-dates";

import type { ContactProfile } from "@/types/contact-profile";

import {

  CONTACT_PROFILE_SECTIONS,
  getRelationshipTreeSectionTitle,

} from "@/types/contact-profile";

import type { ContactSourceMetadata } from "@/types/source-metadata";

import { RelationshipTreeSection } from "@/components/RelationshipTreeSection";
import { SocialMediaSection } from "@/components/SocialMediaSection";
import type { SocialMediaPersistOptions } from "@/components/SocialMediaSection";
import { RelationshipTypeSelect } from "@/components/RelationshipTypeSelect";
import { SectionSaveBar } from "@/components/SectionSaveBar";
import {
  KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY,
  readPrimaryRelationshipTypeFromProfile,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";

import { ChevronDown } from "lucide-react";

const GROUP_ACCENTS = [
  "text-foreground",
  "text-foreground",
  "text-foreground",
] as const;

interface ProfileSectionsEditorProps {
  profile: ContactProfile;
  onChange: (profile: ContactProfile) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  contactId?: string;
  contactName?: string;
  sourceMetadata?: ContactSourceMetadata;
  savingSectionId: string | null;
  sectionStatus: Record<string, { error?: string; message?: string }>;
  isSectionDirty: (sectionId: string) => boolean;
  onSaveSection: (sectionId: string) => void;
  onCancelSection: (sectionId: string) => void;
  onPersistRelationshipTree: (
    profile: ContactProfile
  ) => Promise<{ ok: boolean; error?: string }>;
  onPersistSocialMedia: (
    profile: ContactProfile,
    options?: SocialMediaPersistOptions
  ) => Promise<{ ok: boolean; error?: string }>;
  lockedName?: { firstName?: string; lastName?: string };
  hiddenSectionIds?: string[];
}

function ProfileFieldInput({

  field,

  value,

  onChange,

  showLabel,

  contactId,

  sourceMetadata,

}: {

  field: (typeof CONTACT_PROFILE_SECTIONS)[number]["groups"][number]["fields"][number];

  value: string;

  onChange: (value: string) => void;

  showLabel: boolean;

  contactId?: string;

  sourceMetadata?: ContactSourceMetadata;

}) {

  return (

    <label className="flex flex-col gap-1.5">

      {showLabel && (

        <span className="ui-label flex items-center gap-1">

          {field.label}

          {contactId && sourceMetadata?.[field.key] && (

            <SourceCitation

              contactId={contactId}

              fieldKey={field.key}

              source={sourceMetadata[field.key]}

            />

          )}

        </span>

      )}

      {!showLabel && contactId && sourceMetadata?.[field.key] && (

        <span className="flex items-center gap-1">

          <SourceCitation

            contactId={contactId}

            fieldKey={field.key}

            source={sourceMetadata[field.key]}

          />

        </span>

      )}

      {field.singleLine && isContactDateProfileField(field.key) ? (
        <input
          type="text"
          inputMode="numeric"
          value={contactDateInputValue(value)}
          onChange={(e) => onChange(e.target.value)}
          className="ui-input px-3 py-2.5 text-sm"
          placeholder={CONTACT_DATE_PLACEHOLDER}
          aria-label={`${field.label} (${CONTACT_DATE_PLACEHOLDER})`}
        />
      ) : field.singleLine ? (

        <input

          type="text"

          value={value}

          onChange={(e) => onChange(e.target.value)}

          className="ui-input px-3 py-2.5 text-sm"

        />

      ) : (

        <textarea

          value={value}

          onChange={(e) => onChange(e.target.value)}

          rows={2}

          className="ui-input-editorial resize-none px-3 py-2.5 text-sm"

        />

      )}

    </label>

  );

}



export function ProfileSectionsEditor({

  profile,

  onChange,

  openSections,

  onToggleSection,

  contactId,

  contactName,

  sourceMetadata,

  savingSectionId,

  sectionStatus,

  isSectionDirty,

  onSaveSection,

  onCancelSection,

  onPersistRelationshipTree,

  onPersistSocialMedia,

  lockedName,

  hiddenSectionIds = [],

}: ProfileSectionsEditorProps) {

  const updateField = (key: keyof ContactProfile, value: string) => {

    onChange({ ...profile, [key]: value });

  };

  const updatePrimaryRelationshipType = (type: RelationshipType | "") => {
    const next: ContactProfile = { ...profile };
    if (type) {
      next[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY] = type;
    } else {
      delete next[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY];
    }
    onChange(next);
  };



  return (

    <div className="flex flex-col gap-2.5">

      {CONTACT_PROFILE_SECTIONS.filter(
        (section) => !hiddenSectionIds.includes(section.id)
      ).map((section) => {
        const isOpen = openSections[section.id] ?? false;

        const isRelationshipTree = section.id === "relationshipTree";
        const isSpecialSection =
          section.id === "relationshipTree" || section.id === "socialMedia";

        return (

          <div
            key={section.id}
            className={`ui-card overflow-hidden ${
              isRelationshipTree ? "ui-card-tint-green border-border-green" : ""
            }`}
          >

            <button

              type="button"

              onClick={() => onToggleSection(section.id)}

              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"

              aria-expanded={isOpen}

            >

              <div>
                <p className="type-section-title font-sans text-sm tracking-tight">
                  {section.id === "relationshipTree" && contactName
                    ? getRelationshipTreeSectionTitle(contactName)
                    : section.title}
                </p>
              </div>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
              />

            </button>



            {isOpen && (
              <div
                className={`flex flex-col gap-5 border-t px-4 py-4 ${
                  isRelationshipTree
                    ? "border-border-green/50"
                    : "border-hotel-border"
                }`}
              >
                {section.id === "relationshipTree" ? (
                  <RelationshipTreeSection
                    profile={profile}
                    contactName={contactName ?? ""}
                    onChange={onChange}
                    onPersist={onPersistRelationshipTree}
                  />
                ) : section.id === "socialMedia" ? (
                  <SocialMediaSection
                    profile={profile}
                    onChange={onChange}
                    onPersist={onPersistSocialMedia}
                    lockedName={lockedName}
                  />
                ) : section.id === "customerInfo" ? (
                  <>
                    <div className="rounded-lg border border-border/60 bg-card-hover/50 p-3.5">
                      <RelationshipTypeSelect
                        id={`${contactId ?? "new"}-contact-info-type`}
                        label="Contact Info Type"
                        value={readPrimaryRelationshipTypeFromProfile(profile)}
                        onChange={updatePrimaryRelationshipType}
                      />
                    </div>
                    {section.groups.map((group, groupIndex) => {
                  const isSingleField = group.fields.length === 1;
                  const isStackedLayout = isSingleField || Boolean(group.stacked);



                  return (

                    <div

                      key={group.id}

                      className="rounded-lg border border-border/60 bg-card-hover/50 p-3.5"

                    >

                      <div className="mb-3">
                        <p className={`type-section-title font-sans text-sm tracking-tight ${GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length]}`}>
                          {group.title}
                        </p>
                      </div>



                      <div

                        className={
                          isStackedLayout
                            ? "flex flex-col gap-3"
                            : "grid grid-cols-1 gap-3 sm:grid-cols-2"
                        }

                      >

                        {group.fields.map((field) => (

                          <ProfileFieldInput

                            key={field.key}

                            field={field}

                            value={profile[field.key] ?? ""}

                            onChange={(value) => updateField(field.key, value)}

                            showLabel={!isSingleField}

                            contactId={contactId}

                            sourceMetadata={sourceMetadata}

                          />

                        ))}

                      </div>

                    </div>

                  );
                })}
                  </>
                ) : (
                  section.groups.map((group, groupIndex) => {
                  const isSingleField = group.fields.length === 1;
                  const isStackedLayout = isSingleField || Boolean(group.stacked);



                  return (

                    <div

                      key={group.id}

                      className="rounded-lg border border-border/60 bg-card-hover/50 p-3.5"

                    >

                      <div className="mb-3">
                        <p className={`type-section-title font-sans text-sm tracking-tight ${GROUP_ACCENTS[groupIndex % GROUP_ACCENTS.length]}`}>
                          {group.title}
                        </p>
                      </div>



                      <div

                        className={
                          isStackedLayout
                            ? "flex flex-col gap-3"
                            : "grid grid-cols-1 gap-3 sm:grid-cols-2"
                        }

                      >

                        {group.fields.map((field) => (

                          <ProfileFieldInput

                            key={field.key}

                            field={field}

                            value={profile[field.key] ?? ""}

                            onChange={(value) => updateField(field.key, value)}

                            showLabel={!isSingleField}

                            contactId={contactId}

                            sourceMetadata={sourceMetadata}

                          />

                        ))}

                      </div>

                    </div>

                  );
                })
                )}
                {!isSpecialSection && (
                  <SectionSaveBar
                    isDirty={isSectionDirty(section.id)}
                    isSaving={savingSectionId === section.id}
                    error={sectionStatus[section.id]?.error}
                    message={sectionStatus[section.id]?.message}
                    onSave={() => void onSaveSection(section.id)}
                    onCancel={() => onCancelSection(section.id)}
                  />
                )}
              </div>
            )}

          </div>

        );

      })}

    </div>

  );

}


