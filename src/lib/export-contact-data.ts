import type { ContactDetail } from "@/types/contact";
import { CONTACT_TYPE_LABELS } from "@/lib/contacts/contact-type";
import { serializeNotesLog } from "@/lib/contacts/notes-log";
import {
  CONTACT_PROFILE_SECTIONS,
  getAllProfileFieldsInContext,
  profileFieldExportLabel,
} from "@/types/contact-profile";
import {
  relationshipTreeExportLines,
  relationshipTreeFromProfile,
} from "@/lib/contacts/relationship-tree";

const BASE_COLUMNS = [
  "Name",
  "Company",
  "Contact Type",
  "Role",
  "Last Contact",
  "Last Meeting Date",
  "Next Steps",
  "Topics",
  "KinSight Activity History",
] as const;

function getProfileColumns(): string[] {
  return getAllProfileFieldsInContext().map((field) =>
    profileFieldExportLabel(field, field.group)
  );
}

export function getExportColumns(): string[] {
  return [...BASE_COLUMNS, ...getProfileColumns()];
}

function profileValue(
  contact: ContactDetail,
  fieldKey: import("@/types/contact-profile").ContactProfileFieldKey
): string {
  return contact.profile?.[fieldKey]?.trim() ?? "";
}

function notesLogExportValue(contact: ContactDetail): string {
  const entries = contact.notesLog ?? [];
  return entries.length > 0
    ? serializeNotesLog(entries)
    : contact.notes?.trim() ?? "";
}

export function contactToExportRow(
  contact: ContactDetail
): Record<string, string> {
  const row: Record<string, string> = {
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
    "KinSight Activity History": notesLogExportValue(contact),
  };

  for (const field of getAllProfileFieldsInContext()) {
    row[profileFieldExportLabel(field, field.group)] = profileValue(
      contact,
      field.key
    );
  }

  return row;
}

export function contactsToExportRows(
  contacts: ContactDetail[]
): Record<string, string>[] {
  return contacts.map(contactToExportRow);
}

export function orderedExportRows(
  contacts: ContactDetail[]
): Record<string, string>[] {
  const columns = getExportColumns();
  return contactsToExportRows(contacts).map((row) => {
    const ordered: Record<string, string> = {};
    for (const col of columns) {
      ordered[col] = row[col] ?? "";
    }
    return ordered;
  });
}

export function contactToTxtBlock(contact: ContactDetail): string {
  const lines: string[] = [];
  const divider = "=".repeat(64);

  lines.push(divider);
  lines.push(`CONTACT: ${contact.name}`);
  lines.push(divider);
  lines.push("");
  lines.push("BASIC INFORMATION");
  lines.push("-".repeat(32));
  lines.push(`Company: ${contact.company || "—"}`);
  lines.push(`Role: ${contact.role || "—"}`);
  lines.push(
    `Contact Type: ${
      contact.contactType
        ? CONTACT_TYPE_LABELS[contact.contactType]
        : contact.contactTypeNeedsConfirmation
          ? "Needs confirmation"
          : "—"
    }`
  );
  lines.push(`Last Contact: ${contact.lastContact || "—"}`);
  lines.push(`Last Meeting Date: ${contact.lastMeetingDate || "—"}`);
  lines.push(`Next Steps: ${contact.nextSteps?.trim() || "—"}`);
  lines.push(`Topics: ${contact.topics?.join(", ") || "—"}`);

  const notesLogText = notesLogExportValue(contact);
  if (notesLogText) {
    lines.push("");
    lines.push("KINSIGHT ACTIVITY HISTORY");
    lines.push("-".repeat(32));
    lines.push(notesLogText);
  }

  for (const section of CONTACT_PROFILE_SECTIONS) {
    if (section.id === "relationshipTree") {
      const treeLines = relationshipTreeExportLines(
        relationshipTreeFromProfile(contact.profile)
      );
      if (treeLines.length > 0) {
        lines.push("");
        lines.push(...treeLines);
      }
      continue;
    }

    lines.push("");
    lines.push(section.title.toUpperCase());
    lines.push("-".repeat(32));

    for (const group of section.groups) {
      const groupValues = group.fields
        .map((field) => {
          const value = profileValue(contact, field.key);
          return value ? { field, value } : null;
        })
        .filter(Boolean) as {
        field: (typeof group.fields)[number];
        value: string;
      }[];

      if (groupValues.length === 0) continue;

      lines.push("");
      lines.push(group.title);

      for (const { field, value } of groupValues) {
        if (group.fields.length === 1) {
          lines.push(value);
        } else {
          lines.push(`  ${field.label}: ${value}`);
        }
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function buildSingleContactExportFilename(
  contactName: string,
  format: "txt" | "xlsx"
): string {
  const safe =
    contactName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") ||
    "contact";
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}-${date}.${format}`;
}

export function downloadTextFile(
  content: string,
  filename = "kinsight-contacts.txt"
): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
