import {
  getRelationshipEntryFacts,
  getRelationshipTypeLabel,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";

export const RELATIONSHIP_TREE_EXPORT_COLUMNS = [
  "Relationship Type",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Birthday",
  "Anniversary",
  "Company",
  "Job Title",
  "Influence Level",
  "Preferred Contact Method",
  "Best Time to Call",
  "Notes",
  "Facts",
] as const;

export function relationshipEntryToExportRow(
  entry: RelationshipTreeEntry
): Record<string, string> {
  return {
    "Relationship Type": getRelationshipTypeLabel(entry.relationshipType),
    "First Name": entry.firstName?.trim() ?? "",
    "Last Name": entry.lastName?.trim() ?? "",
    Email: entry.email?.trim() ?? "",
    Phone: entry.phone?.trim() ?? "",
    Birthday: entry.birthday?.trim() ?? "",
    Anniversary: entry.anniversary?.trim() ?? "",
    Company: entry.company?.trim() ?? "",
    "Job Title": entry.jobTitle?.trim() ?? "",
    "Influence Level": entry.influenceLevel ?? "",
    "Preferred Contact Method": entry.preferredContactMethod?.trim() ?? "",
    "Best Time to Call": entry.bestTimeToCall?.trim() ?? "",
    Notes: entry.notes?.trim() ?? "",
    Facts: getRelationshipEntryFacts(entry).join("; "),
  };
}

export function buildRelationshipTreeExportFilename(contactName: string): string {
  const safe =
    contactName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") ||
    "contact";
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}-relationship-tree-${date}.xlsx`;
}

export async function exportRelationshipTreeToExcel(
  contactName: string,
  entries: RelationshipTreeEntry[]
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = entries.map(relationshipEntryToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Related Contacts");

  worksheet["!cols"] = RELATIONSHIP_TREE_EXPORT_COLUMNS.map((column) => ({
    wch: Math.max(column.length, 16),
  }));

  XLSX.writeFile(workbook, buildRelationshipTreeExportFilename(contactName));
}
