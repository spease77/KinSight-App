import * as XLSX from "xlsx";
import JSZip from "jszip";
import type { ContactDetail } from "@/types/contact";
import { CONTACT_TYPE_LABELS } from "@/lib/contacts/contact-type";
import {
  BUSTAMANTE_SADIE_DRIVERS,
  CHASE_HUGHES_CORE_NEEDS,
  extractBehavioralTagsFromProfile,
  formatBehavioralTagLabel,
  type BehavioralProfileTag,
} from "@/lib/psychological-profile";
import {
  CONTACT_PROFILE_SECTIONS,
  getAllProfileFieldsInContext,
  profileFieldExportLabel,
} from "@/types/contact-profile";
import type { ExportDataPayload, ExportRelationshipNote } from "@/types/export-data";
import { formatExportTimestamp } from "@/lib/supabase/export-data";
import {
  relationshipTreeExportLines,
  relationshipTreeFromProfile,
} from "@/lib/contacts/relationship-tree";

const CHASE_TAG_SET = new Set(
  CHASE_HUGHES_CORE_NEEDS.map((item) => item.value)
);
const SADIE_TAG_SET = new Set(
  BUSTAMANTE_SADIE_DRIVERS.map((item) => item.value)
);

function profileValue(
  contact: ContactDetail,
  fieldKey: import("@/types/contact-profile").ContactProfileFieldKey
): string {
  return contact.profile?.[fieldKey]?.trim() ?? "";
}

function formatTagGroup(
  tags: BehavioralProfileTag[],
  allowed: Set<BehavioralProfileTag>
): string {
  return tags
    .filter((tag) => allowed.has(tag))
    .map((tag) => formatBehavioralTagLabel(tag))
    .join(", ");
}

function buildContactMetaRows(contacts: ContactDetail[]) {
  return contacts.map((contact) => ({
    Name: contact.name,
    Company: contact.company,
    "Contact Type": contact.contactType
      ? CONTACT_TYPE_LABELS[contact.contactType]
      : contact.contactTypeNeedsConfirmation
        ? "Needs confirmation"
        : "",
    Role: contact.role,
    "Last Contact": contact.lastContact,
    "Last Meeting Date": contact.lastMeetingDate ?? "",
    "Next Steps": contact.nextSteps ?? "",
    Topics: contact.topics?.join(", ") ?? "",
  }));
}

function buildPsychologicalProfileRows(contacts: ContactDetail[]) {
  return contacts.map((contact) => {
    const tags = extractBehavioralTagsFromProfile(contact.profile);
    const row: Record<string, string> = {
      Name: contact.name,
      "Chase Hughes Core Needs": formatTagGroup(tags, CHASE_TAG_SET),
      "SADIE Drivers": formatTagGroup(tags, SADIE_TAG_SET),
    };

    for (const field of getAllProfileFieldsInContext()) {
      row[profileFieldExportLabel(field, field.group)] = profileValue(
        contact,
        field.key
      );
    }

    return row;
  });
}

function buildTimelineLogRows(notes: ExportRelationshipNote[]) {
  return notes.map((note) => ({
    "Contact Name": note.contactName,
    Date: formatExportTimestamp(note.recordedAt),
    Type:
      note.source === "activity_log"
        ? "KinSight Activity Log"
        : "Scheduled Interaction",
    Title: note.title ?? "",
    Content: note.content,
    "Behavioral Tags": note.behavioralTags?.join(", ") ?? "",
  }));
}

function autosizeSheet(
  worksheet: XLSX.WorkSheet,
  rows: Record<string, string>[]
) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(Math.max(header.length, 14), 48),
  }));
}

export function exportDataManagementExcel(
  payload: ExportDataPayload,
  filename = "kinsight-export.xlsx"
): void {
  const workbook = XLSX.utils.book_new();

  const metaRows = buildContactMetaRows(payload.contacts);
  const metaSheet = XLSX.utils.json_to_sheet(metaRows);
  autosizeSheet(metaSheet, metaRows);
  XLSX.utils.book_append_sheet(workbook, metaSheet, "Contact Meta");

  const psychRows = buildPsychologicalProfileRows(payload.contacts);
  const psychSheet = XLSX.utils.json_to_sheet(psychRows);
  autosizeSheet(psychSheet, psychRows);
  XLSX.utils.book_append_sheet(workbook, psychSheet, "Psychological Profiles");

  const timelineRows = buildTimelineLogRows(payload.relationshipNotes);
  const timelineSheet = XLSX.utils.json_to_sheet(
    timelineRows.length > 0
      ? timelineRows
      : [
          {
            "Contact Name": "",
            Date: "",
            Type: "",
            Title: "",
            Content: "",
            "Behavioral Tags": "",
          },
        ]
  );
  autosizeSheet(timelineSheet, timelineRows);
  XLSX.utils.book_append_sheet(workbook, timelineSheet, "Timeline Logs");

  XLSX.writeFile(workbook, filename);
}

function safeFilename(name: string): string {
  return (
    name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "contact"
  );
}

function buildContactDossier(
  contact: ContactDetail,
  notes: ExportRelationshipNote[]
): string {
  const lines: string[] = [];
  const contactNotes = notes.filter((note) => note.contactId === contact.id);
  const tags = extractBehavioralTagsFromProfile(contact.profile);

  lines.push(`# ${contact.name}`);
  lines.push("");
  lines.push(`*Generated: ${new Date().toLocaleString()}*`);
  lines.push("");
  lines.push("## Basic Information");
  lines.push("");
  lines.push(`- **Company:** ${contact.company || "—"}`);
  lines.push(`- **Role:** ${contact.role || "—"}`);
  lines.push(
    `- **Contact Type:** ${
      contact.contactType
        ? CONTACT_TYPE_LABELS[contact.contactType]
        : contact.contactTypeNeedsConfirmation
          ? "Needs confirmation"
          : "—"
    }`
  );
  lines.push(`- **Last Contact:** ${contact.lastContact || "—"}`);
  lines.push(`- **Last Meeting Date:** ${contact.lastMeetingDate || "—"}`);
  lines.push(`- **Next Steps:** ${contact.nextSteps?.trim() || "—"}`);
  lines.push(`- **Topics:** ${contact.topics?.join(", ") || "—"}`);
  lines.push("");
  lines.push("## Psychological Profile");
  lines.push("");
  lines.push(
    `- **Chase Hughes Core Needs:** ${formatTagGroup(tags, CHASE_TAG_SET) || "—"}`
  );
  lines.push(`- **SADIE Drivers:** ${formatTagGroup(tags, SADIE_TAG_SET) || "—"}`);
  lines.push("");

  for (const section of CONTACT_PROFILE_SECTIONS) {
    if (section.id === "relationshipTree") {
      const treeLines = relationshipTreeExportLines(
        relationshipTreeFromProfile(contact.profile)
      );
      if (treeLines.length > 0) {
        lines.push(`### ${section.title}`);
        lines.push("");
        lines.push(...treeLines.map((line) => line.replace(/^/gm, "")));
        lines.push("");
      }
      continue;
    }

    const sectionLines: string[] = [];

    for (const group of section.groups) {
      for (const field of group.fields) {
        const value = profileValue(contact, field.key);
        if (!value) continue;
        sectionLines.push(`- **${field.label}:** ${value}`);
      }
    }

    if (sectionLines.length === 0) continue;

    lines.push(`### ${section.title}`);
    lines.push("");
    lines.push(...sectionLines);
    lines.push("");
  }

  lines.push("## Timeline Logs");
  lines.push("");

  if (contactNotes.length === 0) {
    lines.push("_No timeline entries logged yet._");
  } else {
    for (const note of contactNotes) {
      const typeLabel =
        note.source === "activity_log"
          ? "KinSight Activity Log"
          : "Scheduled Interaction";

      lines.push(
        `### ${formatExportTimestamp(note.recordedAt)} — ${typeLabel}`
      );
      lines.push("");
      if (note.title) {
        lines.push(`**Title:** ${note.title}`);
        lines.push("");
      }
      if (note.behavioralTags && note.behavioralTags.length > 0) {
        lines.push(`**Behavioral Tags:** ${note.behavioralTags.join(", ")}`);
        lines.push("");
      }
      lines.push(note.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportDataManagementTxtZip(
  payload: ExportDataPayload,
  filename = "kinsight-export-dossiers.zip"
): Promise<void> {
  const zip = new JSZip();
  const dateStamp = new Date().toISOString().slice(0, 10);

  for (const contact of payload.contacts) {
    const dossier = buildContactDossier(contact, payload.relationshipNotes);
    zip.file(`${safeFilename(contact.name)}-${dateStamp}.md`, dossier);
  }

  zip.file(
    "README.txt",
    [
      "KinSight Contact Export",
      `Generated: ${new Date().toLocaleString()}`,
      `Contacts: ${payload.contacts.length}`,
      "",
      "Each Markdown file contains one contact dossier with profile and timeline logs.",
    ].join("\n")
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, filename);
}

export async function runDataManagementExport(
  payload: ExportDataPayload,
  options: { exportExcel: boolean; exportTxt: boolean }
): Promise<void> {
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (options.exportExcel) {
    exportDataManagementExcel(payload, `kinsight-export-${dateStamp}.xlsx`);
  }

  if (options.exportTxt) {
    if (options.exportExcel) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await exportDataManagementTxtZip(
      payload,
      `kinsight-export-${dateStamp}.zip`
    );
  }
}
