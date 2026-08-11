"use client";

import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Loader2,
  Plus,
} from "lucide-react";
import {
  createEmptyRelationshipEntry,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  normalizeRelationshipFacts,
  parseRelationshipTree,
  serializeRelationshipTree,
  sortRelationshipTreeEntries,
  withRelationshipEntryFacts,
  type RelationshipTreeEntry,
  type RelationshipTreeSortDirection,
  type RelationshipTreeSortField,
} from "@/lib/contacts/relationship-tree";
import type { ContactProfile } from "@/types/contact-profile";
import { RelationshipContactModal } from "@/components/RelationshipContactModal";
import { RelatedPersonFactsRow } from "@/components/RelatedPersonFactsRow";
import {
  RelationshipTreeSortBar,
  RELATIONSHIP_TREE_SORT_FIELDS,
} from "@/components/RelationshipTreeSortBar";

interface RelationshipTreeSectionProps {
  profile: ContactProfile;
  contactName: string;
  onChange: (profile: ContactProfile) => void;
  onPersist: (
    profile: ContactProfile
  ) => Promise<{ ok: boolean; error?: string }>;
}

type ModalState =
  | { mode: "closed" }
  | { mode: "add"; entry: RelationshipTreeEntry }
  | { mode: "edit"; entry: RelationshipTreeEntry };

function buildProfileWithEntries(
  profile: ContactProfile,
  entries: RelationshipTreeEntry[]
): ContactProfile {
  return {
    ...profile,
    [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree(entries),
  };
}

export function RelationshipTreeSection({
  profile,
  contactName,
  onChange,
  onPersist,
}: RelationshipTreeSectionProps) {
  const treeRaw = profile[KINSIGHT_RELATIONSHIP_TREE_KEY];
  const [sortField, setSortField] =
    useState<RelationshipTreeSortField>("firstName");
  const [sortDirection, setSortDirection] =
    useState<RelationshipTreeSortDirection>("asc");
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingFactsEntryId, setSavingFactsEntryId] = useState<string | null>(
    null
  );
  const [activeFactPersonId, setActiveFactPersonId] = useState<string | null>(
    null
  );
  const [listError, setListError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      sortRelationshipTreeEntries(parseRelationshipTree(treeRaw), {
        field: sortField,
        direction: sortDirection,
      }),
    [treeRaw, sortField, sortDirection]
  );

  const persistEntries = async (
    nextEntries: RelationshipTreeEntry[]
  ): Promise<{ ok: boolean; error?: string }> => {
    const nextProfile = buildProfileWithEntries(profile, nextEntries);
    onChange(nextProfile);
    const result = await onPersist(nextProfile);
    if (!result.ok) {
      const error = result.error ?? "Could not save related contact.";
      setListError(error);
      return { ok: false, error };
    }
    setListError(null);
    return { ok: true };
  };

  const openAddModal = () => {
    setListError(null);
    setModal({ mode: "add", entry: createEmptyRelationshipEntry() });
  };

  const openEditModal = (entry: RelationshipTreeEntry) => {
    setListError(null);
    setModal({ mode: "edit", entry });
  };

  const handleModalSave = async (savedEntry: RelationshipTreeEntry) => {
    const currentEntries = parseRelationshipTree(treeRaw);
    const nextEntries =
      modal.mode === "add"
        ? [...currentEntries, savedEntry]
        : currentEntries.map((entry) =>
            entry.id === savedEntry.id ? savedEntry : entry
          );

    const result = await persistEntries(nextEntries);
    if (!result.ok) {
      throw new Error(result.error ?? "Could not save related contact.");
    }
  };

  const handleRemove = async (entryId: string) => {
    setListError(null);
    setRemovingId(entryId);
    try {
      const currentEntries = parseRelationshipTree(treeRaw);
      await persistEntries(currentEntries.filter((item) => item.id !== entryId));
    } finally {
      setRemovingId(null);
    }
  };

  const handleFactsChange = async (entryId: string, facts: string[]) => {
    setListError(null);
    setSavingFactsEntryId(entryId);
    try {
      const currentEntries = parseRelationshipTree(treeRaw);
      const cleanedFacts = normalizeRelationshipFacts(facts);
      const nextEntries = currentEntries.map((entry) =>
        entry.id === entryId
          ? withRelationshipEntryFacts(entry, cleanedFacts)
          : entry
      );
      const result = await persistEntries(nextEntries);
      if (!result.ok) {
        throw new Error(result.error ?? "Could not save fact.");
      }
      setActiveFactPersonId(null);
    } finally {
      setSavingFactsEntryId(null);
    }
  };

  const handleExportExcel = async () => {
    if (entries.length === 0) return;

    setExportError(null);
    setIsExporting(true);
    try {
      const { exportRelationshipTreeToExcel } = await import(
        "@/lib/contacts/export-relationship-tree"
      );
      await exportRelationshipTreeToExcel(contactName, entries);
    } catch {
      setExportError("Could not export Excel file.");
    } finally {
      setIsExporting(false);
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
        Add Related Contact
      </button>

      <button
        type="button"
        onClick={() => void handleExportExcel()}
        disabled={entries.length === 0 || isExporting}
        className="ui-btn-outline-green flex w-full items-center justify-center gap-2 px-4 py-3 text-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : (
          <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
        )}
        Export to Excel
      </button>

      {exportError && (
        <p className="text-sm text-red-300" role="alert">
          {exportError}
        </p>
      )}

      {entries.length > 0 && (
        <>
          <RelationshipTreeSortBar
            sortField={sortField}
            sortDirection={sortDirection}
            fields={RELATIONSHIP_TREE_SORT_FIELDS}
            onSortFieldChange={setSortField}
            onSortDirectionToggle={() =>
              setSortDirection((current) =>
                current === "asc" ? "desc" : "asc"
              )
            }
          />

          <div className="contact-inset-group__card">
            {entries.map((entry, index) => (
              <RelatedPersonFactsRow
                key={entry.id}
                entry={entry}
                isLast={index === entries.length - 1}
                isSaving={savingFactsEntryId === entry.id}
                isAddingFact={activeFactPersonId === entry.id}
                onStartAddFact={() => setActiveFactPersonId(entry.id)}
                onCancelAddFact={() => setActiveFactPersonId(null)}
                showEditActions
                onFactsChange={handleFactsChange}
                onEdit={() => openEditModal(entry)}
                onRemove={() => void handleRemove(entry.id)}
                isRemoving={removingId === entry.id}
              />
            ))}
          </div>
        </>
      )}

      {listError && (
        <p className="text-sm text-red-300" role="alert">
          {listError}
        </p>
      )}

      {modal.mode !== "closed" && (
        <RelationshipContactModal
          entry={modal.entry}
          isNew={modal.mode === "add"}
          onClose={() => setModal({ mode: "closed" })}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
