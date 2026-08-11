"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import { parseImportedNotesLog } from "@/lib/contacts/notes-log";
import { exportSingleContactToTxt } from "@/lib/export-contact-detail";

interface ContactNotesImportExportProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
  className?: string;
}

export function ContactNotesImportExport({
  contact,
  onContactUpdate,
  className = "",
}: ContactNotesImportExportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleImportClick = () => {
    setError(null);
    setStatus(null);
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setStatus(null);

    try {
      const raw = await file.text();
      const parsed = parseImportedNotesLog(raw);

      if (parsed.length === 0) {
        setError("No valid notes found in that file.");
        return;
      }

      const replace = window.confirm(
        `Import ${parsed.length} note${parsed.length === 1 ? "" : "s"}?\n\nOK = merge with existing log\nCancel = replace entire log`
      )
        ? "merge"
        : "replace";

      const res = await fetch(`/api/contacts/${contact.id}/notes/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsed, mode: replace }),
      });

      const data = (await res.json()) as {
        contact?: ContactDetail;
        importedCount?: number;
        error?: string;
      };

      if (!res.ok || !data.contact) {
        setError(data.error ?? "Could not import notes.");
        return;
      }

      onContactUpdate?.(data.contact);
      setStatus(
        `Imported ${data.importedCount ?? parsed.length} note${parsed.length === 1 ? "" : "s"}.`
      );
    } catch {
      setError("Could not read import file.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTxt = () => {
    setError(null);
    exportSingleContactToTxt(contact);
  };

  const handleExportExcel = async () => {
    setError(null);
    setIsExportingExcel(true);
    try {
      const { exportSingleContactToExcel } = await import("@/lib/export-contacts");
      exportSingleContactToExcel(contact);
    } catch {
      setError("Could not export Excel file.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImportClick}
          disabled={isImporting}
          className="ui-btn-outline-green flex items-center gap-1.5 px-3 py-2 text-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isImporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-icon" strokeWidth={2} />
          ) : (
            <Upload className="h-3.5 w-3.5 text-icon" strokeWidth={2} />
          )}
          Import
        </button>
        <button
          type="button"
          onClick={handleExportTxt}
          className="ui-btn-outline-green flex items-center gap-1.5 px-3 py-2 text-xs active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5 text-icon" strokeWidth={2} />
          Export TXT
        </button>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={isExportingExcel}
          className="ui-btn-outline-green flex items-center gap-1.5 px-3 py-2 text-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExportingExcel ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-icon" strokeWidth={2} />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 text-icon" strokeWidth={2} />
          )}
          Export Excel
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.txt,text/plain,application/json"
        className="sr-only"
        onChange={handleFileChange}
      />
      {status && (
        <p className="mt-2 text-xs text-muted">{status}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
