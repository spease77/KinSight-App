"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  applyLinkedInEnrichmentToProfile,
  fetchLinkedInEnrichment,
  isLinkedInUrl,
} from "@/lib/contacts/linkedin-enrichment";
import {
  createEmptySocialMediaEntry,
  getSocialMediaDisplayText,
  getSocialMediaSubtitle,
  KINSIGHT_SOCIAL_MEDIA_KEY,
  parseSocialMedia,
  serializeSocialMedia,
  sortSocialMediaEntries,
  type SocialMediaEntry,
} from "@/lib/contacts/social-media";
import type { ContactProfile } from "@/types/contact-profile";
import { SocialMediaUrlModal } from "@/components/SocialMediaUrlModal";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export interface SocialMediaPersistOptions {
  linkedInEnriched?: boolean;
}

interface SocialMediaSectionProps {
  profile: ContactProfile;
  onChange: (profile: ContactProfile) => void;
  onPersist: (
    profile: ContactProfile,
    options?: SocialMediaPersistOptions
  ) => Promise<{ ok: boolean; error?: string }>;
  lockedName?: { firstName?: string; lastName?: string };
}

type ModalState =
  | { mode: "closed" }
  | { mode: "add"; entry: SocialMediaEntry }
  | { mode: "edit"; entry: SocialMediaEntry };

function SocialMediaEntrySummary({
  entry,
  onEdit,
  onRemove,
  isRemoving,
}: {
  entry: SocialMediaEntry;
  onEdit: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const displayText = getSocialMediaDisplayText(entry);
  const subtitle = getSocialMediaSubtitle(entry);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card-hover/50 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-0 items-center gap-1.5 font-sans text-sm text-foreground hover:text-accent-green-bright"
        >
          <span className="truncate">{displayText}</span>
          <ExternalLink
            className="h-3.5 w-3.5 shrink-0 text-icon opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={2}
          />
        </a>
        {subtitle && (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={isRemoving}
        className="text-muted transition-colors hover:text-foreground disabled:opacity-40"
        aria-label={`Edit ${displayText}`}
      >
        <Pencil className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        className="text-muted transition-colors hover:text-red-300 disabled:opacity-40"
        aria-label={`Remove ${displayText}`}
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function buildProfileWithEntries(
  profile: ContactProfile,
  entries: SocialMediaEntry[]
): ContactProfile {
  return {
    ...profile,
    [KINSIGHT_SOCIAL_MEDIA_KEY]: serializeSocialMedia(entries),
  };
}

function withLinkedInLabel(entry: SocialMediaEntry): SocialMediaEntry {
  if (!isLinkedInUrl(entry.url) || entry.label?.trim()) {
    return entry;
  }

  return { ...entry, label: "LinkedIn" };
}

export function SocialMediaSection({
  profile,
  onChange,
  onPersist,
  lockedName,
}: SocialMediaSectionProps) {
  const mediaRaw = profile[KINSIGHT_SOCIAL_MEDIA_KEY];
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const entries = useMemo(
    () => sortSocialMediaEntries(parseSocialMedia(mediaRaw)),
    [mediaRaw]
  );

  const persistEntries = async (
    nextEntries: SocialMediaEntry[],
    options?: SocialMediaPersistOptions
  ): Promise<{ ok: boolean; error?: string }> => {
    const nextProfile = buildProfileWithEntries(profile, nextEntries);
    onChange(nextProfile);
    const result = await onPersist(nextProfile, options);
    if (!result.ok) {
      const error = result.error ?? "Could not save URL.";
      setListError(error);
      return { ok: false, error };
    }
    setListError(null);
    return { ok: true };
  };

  const openAddModal = () => {
    setListError(null);
    setModal({ mode: "add", entry: createEmptySocialMediaEntry() });
  };

  const openEditModal = (entry: SocialMediaEntry) => {
    setListError(null);
    setModal({ mode: "edit", entry });
  };

  const handleModalSave = async (savedEntry: SocialMediaEntry) => {
    const labeledEntry = withLinkedInLabel(savedEntry);
    const currentEntries = parseSocialMedia(mediaRaw);
    const nextEntries =
      modal.mode === "add"
        ? [...currentEntries, labeledEntry]
        : currentEntries.map((entry) =>
            entry.id === labeledEntry.id ? labeledEntry : entry
          );

    let nextProfile = buildProfileWithEntries(profile, nextEntries);
    let linkedInEnriched = false;

    if (isLinkedInUrl(labeledEntry.url)) {
      try {
        const enriched = await fetchLinkedInEnrichment(labeledEntry.url);
        nextProfile = applyLinkedInEnrichmentToProfile(nextProfile, enriched, {
          preserveSavedName: true,
          lockedName,
        });
        linkedInEnriched = true;
        onChange(nextProfile);
        showSuccessToast(
          "LinkedIn professional details added. Saved name was kept."
        );
      } catch (error) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : "Could not fetch LinkedIn profile data."
        );
      }
    }

    const result = await onPersist(nextProfile, {
      linkedInEnriched,
    });
    if (!result.ok) {
      throw new Error(result.error ?? "Could not save URL.");
    }
  };

  const handleRemove = async (entryId: string) => {
    setListError(null);
    setRemovingId(entryId);
    try {
      const currentEntries = parseSocialMedia(mediaRaw);
      await persistEntries(currentEntries.filter((item) => item.id !== entryId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={openAddModal}
        className="ui-btn-outline-green flex w-full items-center justify-center gap-2 px-4 py-3 text-sm active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add URL
      </button>

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <SocialMediaEntrySummary
              key={entry.id}
              entry={entry}
              onEdit={() => openEditModal(entry)}
              onRemove={() => void handleRemove(entry.id)}
              isRemoving={removingId === entry.id}
            />
          ))}
        </div>
      )}

      {listError && (
        <p className="text-sm text-red-300" role="alert">
          {listError}
        </p>
      )}

      {modal.mode !== "closed" && (
        <SocialMediaUrlModal
          entry={modal.entry}
          isNew={modal.mode === "add"}
          onClose={() => setModal({ mode: "closed" })}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
