import type { Contact } from "@/types/contact";
import { formatContactDisplayName } from "@/lib/contacts/sort-contacts";

function profileSearchText(contact: Contact & { profile?: Record<string, string> }): string {
  if (!contact.profile) return "";
  return Object.values(contact.profile).filter(Boolean).join(" ");
}

export function filterContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;

  return contacts.filter((contact) => {
    const haystack = [
      contact.name,
      formatContactDisplayName(contact.name, "first"),
      formatContactDisplayName(contact.name, "last"),
      contact.company,
      contact.role,
      contact.notes,
      contact.nextSteps,
      contact.lastContact,
      contact.topics?.join(" "),
      contact.relationship,
      contact.relationshipLabel,
      contact.relationshipType,
      profileSearchText(contact),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
