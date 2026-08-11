"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import type { Contact } from "@/types/contact";
import type { ExportDataPayload } from "@/types/export-data";
import { Header } from "@/components/Header";
import { ContactAvatar } from "@/components/ContactAvatar";
import { filterContacts } from "@/lib/contacts/filter-contacts";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";
import { readApiJson } from "@/lib/api/read-json";
import { runDataManagementExport } from "@/lib/export-data-management";

export function DataManagementPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [exportExcel, setExportExcel] = useState(true);
  const [exportTxt, setExportTxt] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = await readApiJson<{
        contacts?: Contact[];
        error?: string;
      }>(res);
      setContacts(data.contacts ?? []);
      if (data.error) setLoadError(data.error);
    } catch (err) {
      setContacts([]);
      setLoadError(
        err instanceof Error ? err.message : "Could not load contacts."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(
    () => filterContacts(contacts, searchQuery),
    [contacts, searchQuery]
  );

  const allVisibleSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((contact) =>
      selectedContactIds.includes(contact.id)
    );

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredContacts.map((contact) => contact.id));
      setSelectedContactIds((current) =>
        current.filter((id) => !visibleIds.has(id))
      );
      return;
    }

    const merged = new Set([
      ...selectedContactIds,
      ...filteredContacts.map((contact) => contact.id),
    ]);
    setSelectedContactIds(Array.from(merged));
  };

  const handleToggleContact = (contactId: string) => {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  };

  const handleExportData = async () => {
    if (selectedContactIds.length === 0) {
      setExportError("Select at least one contact to export.");
      return;
    }

    if (!exportExcel && !exportTxt) {
      setExportError("Choose at least one export format.");
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportStatus(null);

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContactIds }),
      });

      const payload = await readApiJson<ExportDataPayload & { error?: string }>(
        res
      );

      if (!res.ok) {
        throw new Error(payload.error ?? "Export failed.");
      }

      await runDataManagementExport(payload, { exportExcel, exportTxt });

      const formats = [
        exportExcel ? "Excel workbook" : null,
        exportTxt ? "TXT dossier ZIP" : null,
      ]
        .filter(Boolean)
        .join(" and ");

      setExportStatus(
        `Generated ${formats} for ${selectedContactIds.length} contact${
          selectedContactIds.length === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not generate export file."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Header title="Data Management" />
      <main className="flex flex-col gap-5 px-5 pb-6 pt-4">
        <section className="ui-card flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="type-section-title font-sans text-sm tracking-tight text-foreground">
                Select Contacts
              </h2>
              <p className="type-meta mt-1">
                {selectedContactIds.length} of {contacts.length} selected
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={filteredContacts.length === 0}
              className="ui-btn-outline-green shrink-0 px-3 py-2 text-xs"
            >
              {allVisibleSelected ? "Clear All" : "Select All"}
            </button>
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search contacts…"
            className="ui-input w-full px-3 py-2.5 text-sm"
            aria-label="Search contacts"
          />

          {isLoading ? (
            <p className="type-meta flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading contacts…
            </p>
          ) : loadError ? (
            <p className="ui-alert-error px-4 py-3 text-center text-sm" role="alert">
              {loadError}
            </p>
          ) : filteredContacts.length === 0 ? (
            <p className="type-meta py-8 text-center">No contacts found.</p>
          ) : (
            <ul className="contacts-scroll flex max-h-[min(52vh,28rem)] flex-col gap-2 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => {
                const isSelected = selectedContactIds.includes(contact.id);
                const displayName = formatContactDisplayName(
                  contact.name,
                  "first"
                );

                return (
                  <li key={contact.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                        isSelected
                          ? "border-border-green bg-accent-green-muted/40"
                          : "border-border/60 bg-card-hover/50 hover:bg-card-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleContact(contact.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--accent-green)]"
                        aria-label={`Select ${displayName}`}
                      />
                      <ContactAvatar
                        name={contact.name}
                        avatarUrl={contact.avatarUrl}
                        size="sm"
                        className="!h-10 !w-10 !text-sm"
                      />
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-foreground">
                        {displayName}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ui-card flex flex-col gap-3 p-4">
          <h2 className="type-section-title font-sans text-sm tracking-tight text-foreground">
            Export Formats
          </h2>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card-hover/40 px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-icon" strokeWidth={2} />
              Excel workbook (.xlsx)
            </span>
            <input
              type="checkbox"
              checked={exportExcel}
              onChange={(event) => setExportExcel(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent-green)]"
              aria-label="Export Excel workbook"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card-hover/40 px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <FileText className="h-4 w-4 text-icon" strokeWidth={2} />
              Markdown dossiers (.zip)
            </span>
            <input
              type="checkbox"
              checked={exportTxt}
              onChange={(event) => setExportTxt(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent-green)]"
              aria-label="Export Markdown dossiers"
            />
          </label>
        </section>

        <button
          type="button"
          onClick={() => void handleExportData()}
          disabled={isExporting || selectedContactIds.length === 0}
          className="ui-btn-green flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Export File…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" strokeWidth={2} />
              Generate Export File
            </>
          )}
        </button>

        {exportError && (
          <p className="ui-alert-error px-4 py-3 text-center text-sm" role="alert">
            {exportError}
          </p>
        )}

        {exportStatus && (
          <p className="text-center text-sm text-muted">{exportStatus}</p>
        )}
      </main>
    </>
  );
}
