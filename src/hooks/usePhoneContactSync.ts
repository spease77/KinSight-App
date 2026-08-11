"use client";

import { useCallback, useState } from "react";
import { readApiJson } from "@/lib/api/read-json";
import {
  isPhoneContactSyncSupported,
  pickPhoneContacts,
} from "@/lib/contacts/phone-contacts";
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
      result.merged > 0
        ? ` · merged/enriched ${result.merged}`
        : "";
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
  const supported = isPhoneContactSyncSupported();

  const syncContacts = useCallback(async () => {
    if (isSyncing) {
      console.info(`${LOG_PREFIX} Sync already in progress — ignoring duplicate tap.`);
      return;
    }

    setIsSyncing(true);
    setError(null);
    setLastResult(null);

    console.info(`${LOG_PREFIX} Sync started.`, {
      pickerSupported: supported,
    });

    try {
      if (!supported) {
        const message =
          "Phone contact sync is not supported in this browser. Try Chrome on Android, or add contacts manually.";
        console.warn(`${LOG_PREFIX} Picker not supported in this browser.`);
        setError(message);
        showErrorToast(message);
        return;
      }

      const picked = await pickPhoneContacts();
      console.info(`${LOG_PREFIX} Picker returned ${picked.length} contact(s).`, {
        sample: picked.slice(0, 3).map((contact) => contact.name),
      });

      if (picked.length === 0) {
        console.info(`${LOG_PREFIX} No contacts selected — picker closed without changes.`);
        return;
      }

      const payload = { contacts: picked };
      console.info(`${LOG_PREFIX} POST /api/contacts/sync`, {
        contactCount: picked.length,
      });

      const res = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readApiJson<SyncApiResponse>(res);

      console.info(`${LOG_PREFIX} API response`, {
        ok: res.ok,
        status: res.status,
        added: data.added,
        merged: data.merged,
        skipped: data.skipped,
        summary: data.summary,
        error: data.error,
      });

      if (!res.ok) {
        const message = data.error ?? "Sync failed. Please try again.";
        console.error(`${LOG_PREFIX} API error`, { status: res.status, message });
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
      const successMessage = buildSuccessMessage(result);
      console.info(`${LOG_PREFIX} Sync succeeded.`, result);
      showSuccessToast(successMessage);
      onComplete?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not sync phone contacts.";
      console.error(`${LOG_PREFIX} Sync failed`, err);
      setError(message);
      showErrorToast(message);
    } finally {
      setIsSyncing(false);
      console.info(`${LOG_PREFIX} Sync finished.`);
    }
  }, [isSyncing, onComplete, supported]);

  const clearStatus = useCallback(() => {
    setError(null);
    setLastResult(null);
  }, []);

  return {
    supported,
    isSyncing,
    error,
    lastResult,
    syncContacts,
    clearStatus,
  };
}
