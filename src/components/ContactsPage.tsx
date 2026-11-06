"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PageBody } from "@/components/PageBody";
import { PageHeader } from "@/components/PageHeader";
import { ContactList } from "@/components/ContactList";
import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { useContacts } from "@/hooks/useContacts";
import { PhoneContactSyncSheet } from "@/components/PhoneContactSyncSheet";
import { usePhoneContactSync } from "@/hooks/usePhoneContactSync";
import { setContactsShortcutReady } from "@/lib/contacts/ios-shortcut";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";

export function ContactsPage() {
  const { contacts, error, isLoading, reload } = useContacts();
  const {
    isSyncing,
    error: syncError,
    sheetOpen,
    fileInputRef,
    accept,
    syncContacts,
    importFiles,
    createIosShortcut,
    runIosShortcut,
    closeSheet,
    openSheet,
    clearStatus,
  } = usePhoneContactSync(reload);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const synced = params.get("contactsSynced") === "1";
    const missing = params.get("shortcutMissing") === "1";
    if (!synced && !missing) return;

    if (synced) {
      setContactsShortcutReady(true);
      showSuccessToast("iPhone contacts synced.");
      void reload();
    }
    if (missing) {
      setContactsShortcutReady(false);
      showErrorToast(
        "Apple will not let KinSight install the shortcut. Create “KinSight Contacts” once, then Sync is one tap."
      );
      openSheet();
    }

    params.delete("contactsSynced");
    params.delete("shortcutMissing");
    const next = params.toString();
    window.history.replaceState(
      null,
      "",
      next ? `${window.location.pathname}?${next}` : window.location.pathname
    );
  }, [openSheet, reload]);

  const statusMessage = syncError;

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        href="/contacts/new"
        className="
          ui-btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          active:scale-[0.98]
        "
      >
        <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
        Add
      </Link>
      <button
        type="button"
        onClick={() => {
          clearStatus();
          void syncContacts();
        }}
        disabled={isSyncing || isLoading}
        aria-busy={isSyncing}
        className="
          ui-btn-outline-green flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40
        "
        aria-label={
          isSyncing ? "Syncing phone contacts" : "Sync phone contacts"
        }
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-icon" strokeWidth={2} />
        ) : (
          <RefreshCw className="h-3.5 w-3.5 text-icon" strokeWidth={2} />
        )}
        Sync
      </button>
    </div>
  );

  return (
    <>
      <PageHeader>
        <Header title="Contacts" headerActions={headerActions} />
      </PageHeader>
      <PageBody className="flex flex-col gap-4 px-0">
        {statusMessage && (
          <p className="ui-card ui-alert-error mx-4 px-4 py-3 text-sm" role="alert">
            {statusMessage}
          </p>
        )}

        {error && <DatabaseSetupNotice error={error} />}
        {isLoading ? (
          <p className="type-meta text-center">
            Loading contacts…
          </p>
        ) : contacts.length === 0 && !error ? (
          <p className="ui-card type-editorial border-dashed px-4 py-8 text-center text-sm text-muted">
            No contacts yet. Tap{" "}
            <Link href="/contacts/new" className="text-foreground underline decoration-border-orange">
              Add
            </Link>{" "}
            to create one manually,{" "}
            <span className="text-foreground">Sync</span> from
            your phone, or use{" "}
            <span className="text-foreground">Home</span> for
            voice capture.
          </p>
        ) : (
          <ContactList
            contacts={contacts}
            fullPage
            showHeading={false}
            sortable
            searchable
          />
        )}
      </PageBody>

      <PhoneContactSyncSheet
        open={sheetOpen}
        accept={accept}
        fileInputRef={fileInputRef}
        onClose={closeSheet}
        onFiles={(files) => {
          void importFiles(files);
        }}
        onCreateShortcut={() => {
          void createIosShortcut();
        }}
        onRunShortcut={runIosShortcut}
      />
    </>
  );
}
