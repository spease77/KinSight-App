import { readApiJson } from "@/lib/api/read-json";
import { uploadContactAvatarBlob } from "@/lib/contacts/contact-avatar-client";
import {
  enrichContactWithRelationship,
  relationshipToType,
} from "@/lib/contacts/contact-relationship";
import {
  applyEditContactFieldState,
  type EditContactFieldState,
} from "@/lib/contacts/labeled-contact-fields";
import { inferContactTypeFromRelationshipType } from "@/lib/contacts/relationship-tree";
import { composeContactName } from "@/types/contact-profile";
import type { ContactDetail } from "@/types/contact";

export async function saveNewContact(
  state: EditContactFieldState,
  options?: { avatarBlob?: Blob | null }
): Promise<{ contact?: ContactDetail; error?: string }> {
  const profile = applyEditContactFieldState({}, state);
  const name = composeContactName(profile);

  if (!name.trim()) {
    return { error: "Enter a first name before saving." };
  }

  const relationshipType = relationshipToType(state.relationship);
  const contactType = relationshipType
    ? inferContactTypeFromRelationshipType(relationshipType)
    : null;

  const res = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      company: state.companyName.trim() || undefined,
      profile,
      contactType,
      contactTypeNeedsConfirmation: false,
    }),
  });

  const data = await readApiJson<{ contact?: ContactDetail; error?: string }>(
    res
  );

  if (!res.ok) {
    return { error: data.error ?? "Could not create contact." };
  }

  let savedContact = data.contact;
  if (!savedContact?.id) {
    return { error: "Contact was created but could not be opened." };
  }

  const avatarBlob = options?.avatarBlob;
  if (avatarBlob) {
    const avatarResult = await uploadContactAvatarBlob(
      savedContact.id,
      avatarBlob
    );
    if (avatarResult.contact) {
      savedContact = avatarResult.contact;
    }
  }

  return {
    contact: enrichContactWithRelationship(savedContact),
  };
}
