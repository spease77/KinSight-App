"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ContactList } from "@/components/ContactList";
import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { useContacts } from "@/hooks/useContacts";
import { usePhoneContactSync } from "@/hooks/usePhoneContactSync";
import { Loader2, RefreshCw, Smartphone, UserPlus } from "lucide-react";

export function ContactsPage() {
  const { contacts, error, isLoading, reload } = useContacts();
  const {
    supported,
    isSyncing,
    error: syncError,
    syncContacts,
    clearStatus,
  } = usePhoneContactSync(reload);

  const statusMessage = syncError;

  return (
    <>
      <Header title="Contacts" />
      <main className="flex flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-start justify-end gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/contacts/new"
              className="
                ui-btn-primary flex items-center gap-2 px-3.5 py-2.5 text-xs
                active:scale-[0.98]
              "
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
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
                ui-btn-outline-green flex items-center gap-2 px-3.5 py-2.5 text-xs
                active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40
              "
              aria-label={
                isSyncing ? "Syncing phone contacts" : "Sync phone contacts"
              }
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-icon" strokeWidth={2} />
              ) : supported ? (
                <RefreshCw className="h-4 w-4 text-icon" strokeWidth={2} />
              ) : (
                <Smartphone className="h-4 w-4 text-icon" strokeWidth={2} />
              )}
              Sync
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="ui-card ui-alert-error px-4 py-3 text-sm" role="alert">
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
      </main>
    </>
  );
}
