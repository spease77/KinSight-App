import type { ContactDetail } from "@/types/contact";
import {
  formatNoteLogTimestamp,
  sortNotesNewestFirst,
} from "@/lib/contacts/notes-log";
import {
  buildSingleContactExportFilename,
  contactToExportRow,
  contactToTxtBlock,
  downloadTextFile,
  getExportColumns,
  orderedExportRows,
} from "@/lib/export-contact-data";
import * as XLSX from "xlsx";

export {
  buildSingleContactExportFilename,
  contactToExportRow,
  contactsToExportRows,
  getExportColumns,
} from "@/lib/export-contact-data";

export function exportContactsToExcel(
  contacts: ContactDetail[],
  filename = "kinsight-contacts.xlsx"
): void {
  const rows = orderedExportRows(contacts);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  worksheet["!cols"] = getExportColumns().map((col) => ({
    wch: Math.min(Math.max(col.length, 14), 40),
  }));

  XLSX.writeFile(workbook, filename);
}

export function buildContactsTxt(contacts: ContactDetail[]): string {
  const header = [
    "KINSIGHT CONTACT EXPORT",
    `Generated: ${new Date().toLocaleString()}`,
    `Total contacts: ${contacts.length}`,
    "",
  ].join("\n");

  const body = contacts.map(contactToTxtBlock).join("\n");
  return `${header}${body}`;
}

export function exportContactsToTxt(
  contacts: ContactDetail[],
  filename = "kinsight-contacts.txt"
): void {
  downloadTextFile(buildContactsTxt(contacts), filename);
}

export type ExportFormat = "excel" | "txt" | "both";

export function exportContacts(
  contacts: ContactDetail[],
  format: ExportFormat
): void {
  if (format === "excel" || format === "both") {
    exportContactsToExcel(contacts);
  }

  if (format === "txt" || format === "both") {
    if (format === "both") {
      setTimeout(() => exportContactsToTxt(contacts), 300);
    } else {
      exportContactsToTxt(contacts);
    }
  }
}

function singleContactExportRow(contact: ContactDetail): Record<string, string> {
  const columns = getExportColumns();
  const row = contactToExportRow(contact);
  const ordered: Record<string, string> = {};
  for (const col of columns) {
    ordered[col] = row[col] ?? "";
  }
  return ordered;
}

function appendNotesSheet(
  workbook: XLSX.WorkBook,
  contact: ContactDetail
): void {
  const entries = contact.notesLog ?? [];
  if (entries.length === 0) return;

  const notesRows = sortNotesNewestFirst(entries).map((entry) => ({
    Date: formatNoteLogTimestamp(entry.recordedAt),
    Content: entry.content,
  }));
  const notesSheet = XLSX.utils.json_to_sheet(notesRows);
  notesSheet["!cols"] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, notesSheet, "KinSight Activity History");
}

export function exportSingleContactToExcel(
  contact: ContactDetail,
  filename?: string
): void {
  const row = singleContactExportRow(contact);
  const worksheet = XLSX.utils.json_to_sheet([row]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contact");

  worksheet["!cols"] = getExportColumns().map((col) => ({
    wch: Math.min(Math.max(col.length, 14), 40),
  }));

  appendNotesSheet(workbook, contact);

  XLSX.writeFile(
    workbook,
    filename ?? buildSingleContactExportFilename(contact.name, "xlsx")
  );
}
