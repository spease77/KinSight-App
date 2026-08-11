import type { Contact } from "@/types/contact";

export type ContactSortField = "first" | "last" | "relationship";
export type ContactSortDirection = "asc" | "desc";

const SORT_FIELD_STORAGE_KEY = "kinsight-contact-sort";
const SORT_DIRECTION_STORAGE_KEY = "kinsight-contact-sort-direction";

export function parseContactName(fullName: string): { first: string; last: string } {
  const name = fullName.trim();
  if (!name) return { first: "", last: "" };

  if (name.includes(",")) {
    const [lastPart, ...rest] = name.split(",").map((part) => part.trim());
    const first = rest.join(" ").trim();
    if (!first) return { first: lastPart, last: "" };
    return { first, last: lastPart };
  }

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { first: parts[0], last: "" };
  }

  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}

export function formatContactDisplayName(
  fullName: string,
  field: ContactSortField
): string {
  const trimmed = fullName.trim();
  if (!trimmed || field === "first" || field === "relationship") return trimmed;

  const { first, last } = parseContactName(trimmed);
  if (!last) return first || trimmed;
  return `${last}, ${first}`;
}

export function getContactInitial(
  fullName: string,
  field: ContactSortField
): string {
  const { first, last } = parseContactName(fullName);
  const letter =
    field === "last" && last
      ? last.charAt(0)
      : first.charAt(0) || fullName.charAt(0);
  return letter.toUpperCase();
}

/** First letters of first and last name (e.g. "Denisse Pease" → "DP"). */
export function getContactInitials(
  fullName: string,
  firstName?: string | null,
  lastName?: string | null
): string {
  const parsed = parseContactName(fullName);
  const first = (firstName?.trim() || parsed.first).trim();
  const last = (lastName?.trim() || parsed.last).trim();

  const firstLetter = first.charAt(0).toUpperCase();
  if (!firstLetter) {
    const fallback = fullName.trim().charAt(0).toUpperCase();
    return fallback || "?";
  }

  if (!last) return firstLetter;

  return `${firstLetter}${last.charAt(0).toUpperCase()}`;
}

export function getContactSortKey(name: string, field: ContactSortField): string {
  const { first, last } = parseContactName(name);
  const key = field === "first" ? first : last || first;
  return key.toLowerCase();
}

function getContactRelationshipSortKey(contact: Contact): string {
  return (
    contact.relationship?.trim().toLowerCase() ||
    contact.relationshipLabel?.trim().toLowerCase() ||
    "\uffff"
  );
}

export function sortContacts(
  contacts: Contact[],
  field: ContactSortField,
  direction: ContactSortDirection = "asc"
): Contact[] {
  const sorted = [...contacts].sort((a, b) => {
    if (field === "relationship") {
      const cmp = getContactRelationshipSortKey(a).localeCompare(
        getContactRelationshipSortKey(b),
        undefined,
        { sensitivity: "base" }
      );
      if (cmp !== 0) return cmp;
    } else {
      const keyA = getContactSortKey(a.name, field);
      const keyB = getContactSortKey(b.name, field);
      const cmp = keyA.localeCompare(keyB, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

export function loadContactSortPreference(): ContactSortField {
  if (typeof window === "undefined") return "first";
  const saved = localStorage.getItem(SORT_FIELD_STORAGE_KEY);
  if (saved === "last" || saved === "relationship" || saved === "first") {
    return saved;
  }
  return "first";
}

export function saveContactSortPreference(field: ContactSortField): void {
  localStorage.setItem(SORT_FIELD_STORAGE_KEY, field);
}

export function loadContactSortDirection(): ContactSortDirection {
  if (typeof window === "undefined") return "asc";
  const saved = localStorage.getItem(SORT_DIRECTION_STORAGE_KEY);
  return saved === "desc" ? "desc" : "asc";
}

export function saveContactSortDirection(direction: ContactSortDirection): void {
  localStorage.setItem(SORT_DIRECTION_STORAGE_KEY, direction);
}

export function toggleContactSortDirection(
  direction: ContactSortDirection
): ContactSortDirection {
  return direction === "asc" ? "desc" : "asc";
}
