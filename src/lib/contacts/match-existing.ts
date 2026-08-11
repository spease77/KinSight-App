import type { Contact } from "@/types/contact";

export function normalizeContactName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function contactNamesMatch(a: string, b: string): boolean {
  const left = normalizeContactName(a);
  const right = normalizeContactName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftParts = left.split(" ");
  const rightParts = right.split(" ");

  if (leftParts.length >= 2 && rightParts.length >= 2) {
    const leftFirst = leftParts[0];
    const leftLast = leftParts[leftParts.length - 1];
    const rightFirst = rightParts[0];
    const rightLast = rightParts[rightParts.length - 1];
    if (leftFirst === rightFirst && leftLast === rightLast) return true;
  }

  if (left.includes(right) || right.includes(left)) {
    return left.length >= 4 && right.length >= 4;
  }

  return false;
}

export function findExistingContactByName(
  displayName: string,
  contacts: Contact[]
): Contact | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;

  return contacts.find((contact) => contactNamesMatch(contact.name, trimmed));
}
