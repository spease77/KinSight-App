import type { Contact } from "@/types/contact";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";

export function formatSelectedContactsLabel(contacts: Contact[]): string {
  if (contacts.length === 0) return "Rapport Goal";

  const names = contacts.map((contact) =>
    formatContactDisplayName(contact.name, "first")
  );

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.length} contacts`;
}
