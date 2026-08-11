import { readApiJson } from "@/lib/api/read-json";
import { enrichContactWithRelationship } from "@/lib/contacts/contact-relationship";
import {
  applyEditContactFieldState,
  type EditContactFieldState,
} from "@/lib/contacts/labeled-contact-fields";
import { composeContactName } from "@/types/contact-profile";
import type { ContactDetail } from "@/types/contact";

export async function saveEditContact(
  contact: ContactDetail,
  state: EditContactFieldState,
  options?: { notesContent?: string }
): Promise<{ contact?: ContactDetail; error?: string }> {
  const profile = applyEditContactFieldState(contact.profile ?? {}, state);
  const name = composeContactName(profile) || contact.name;
  const company = state.companyName.trim() || contact.company;

  const res = await fetch(`/api/contacts/${contact.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, name, company }),
  });

  const data = await readApiJson<{ contact?: ContactDetail; error?: string }>(
    res
  );

  if (!res.ok) {
    return { error: data.error ?? "Could not save contact" };
  }

  let savedContact = data.contact;

  const notesContent = options?.notesContent?.trim();
  if (notesContent) {
    const noteRes = await fetch(`/api/contacts/${contact.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: notesContent }),
    });

    const noteData = await readApiJson<{
      contact?: ContactDetail;
      error?: string;
    }>(noteRes);

    if (!noteRes.ok) {
      return {
        contact: savedContact
          ? enrichContactWithRelationship(savedContact)
          : undefined,
        error: noteData.error ?? "Contact saved but note could not be added.",
      };
    }

    savedContact = noteData.contact ?? savedContact;
  }

  return {
    contact: savedContact ? enrichContactWithRelationship(savedContact) : undefined,
  };
}
