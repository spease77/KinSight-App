import type { ContactDetail } from "@/types/contact";
import {
  buildSingleContactExportFilename,
  contactToTxtBlock,
  downloadTextFile,
} from "@/lib/export-contact-data";

export function buildSingleContactTxt(contact: ContactDetail): string {
  const header = [
    "KINSIGHT CONTACT EXPORT",
    `Generated: ${new Date().toLocaleString()}`,
    "",
  ].join("\n");

  return `${header}${contactToTxtBlock(contact)}`;
}

export function exportSingleContactToTxt(
  contact: ContactDetail,
  filename?: string
): void {
  downloadTextFile(
    buildSingleContactTxt(contact),
    filename ?? buildSingleContactExportFilename(contact.name, "txt")
  );
}
