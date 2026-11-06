"use client";

import { useCallback, useRef, useState } from "react";
import { readApiJson } from "@/lib/api/read-json";
import {
  isPhoneContactSyncSupported,
  pickPhoneContacts,
  type PhoneContactImport,
} from "@/lib/contacts/phone-contacts";
import {
  CONTACT_IMPORT_ACCEPT,
  parseContactImportFiles,
} from "@/lib/contacts/parse-contact-file";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

const LOG_PREFIX = "[KinSight contact-sync]";

interface SyncResult {
  added: number;
  merged: number;
  skipped: number;
  summary: string;
}

interface SyncApiResponse {
  success?: boolean;
  error?: string;
  added?: number;
  merged?: number;
  skipped?: number;
  summary?: string;
}

function buildSuccessMessage(result: SyncResult): string {
  if (result.summary.trim()) {
    return result.summary;
  }

  if (result.added > 0) {
    const mergedSuffix =
      result.merged > 0 ? ` · merged/enriched ${result.merged}` : "";
    const skippedSuffix =
      result.skipped > 0 ? ` · ${result.skipped} already up to date` : "";
    return `Added ${result.added} contact${result.added === 1 ? "" : "s"}${mergedSuffix}${skippedSuffix}`;
  }

  if (result.merged > 0) {
    const skippedSuffix =
      result.skipped > 0 ? ` · ${result.skipped} already up to date` : "";
    return `Merged/enriched ${result.merged} contact${result.merged === 1 ? "" : "s"} with no data loss${skippedSuffix}`;
  }

  if (result.skipped > 0) {
    return "Selected contacts are already up to date in KinSight.";
  }

  return "Sync complete.";
}

export function usePhoneContactSync(onComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickerSupported = isPhoneContactSyncSupported();

  const postContacts = useCallback(
    async (picked: PhoneContactImport[]) => {
      if (picked.length === 0) {
        const message = "No contacts found in that file.";
        setError(message);
        showErrorToast(message);
        return;
      }

      const res = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: picked }),
      });

      const data = await readApiJson<SyncApiResponse>(res);
      if (!res.ok) {
        const message = data.error ?? "Sync failed. Please try again.";
        setError(message);
        showErrorToast(message);
        return;
      }

      const result = {
        added: data.added ?? 0,
        merged: data.merged ?? 0,
        skipped: data.skipped ?? 0,
        summary: data.summary ?? "",
      };
      setLastResult(result);
      setError(null);
      showSuccessToast(buildSuccessMessage(result));
      onComplete?.();
    },
    [onComplete]
  );

  const syncContacts = useCallback(async () => {
    if (isSyncing) return;

    setError(null);
    setLastResult(null);

    if (!pickerSupported) {
      setSheetOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const picked = await pickPhoneContacts();
      if (picked.length === 0) return;
      await postContacts(picked);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not sync phone contacts.";
      setError(message);
      showErrorToast(message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pickerSupported, postContacts]);

  const importFiles = useCallback(
    async (fileList: FileList | null) => {
      const files = fileList ? Array.from(fileList) : [];
      if (files.length === 0) return;

      setSheetOpen(false);
      setIsSyncing(true);
      setError(null);

      try {
        const picked = await parseContactImportFiles(files);
        console.info(`${LOG_PREFIX} Parsed ${picked.length} contact(s) from file.`);
        await postContacts(picked);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not read that contacts file.";
        setError(message);
        showErrorToast(message);
      } finally {
        setIsSyncing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [postContacts]
  );

  const clearStatus = useCallback(() => {
    setError(null);
    setLastResult(null);
  }, []);

  return {
    pickerSupported,
    isSyncing,
    error,
    lastResult,
    sheetOpen,
    fileInputRef,
    accept: CONTACT_IMPORT_ACCEPT,
    syncContacts,
    importFiles,
    closeSheet: () => setSheetOpen(false),
    clearStatus,
  };
}
