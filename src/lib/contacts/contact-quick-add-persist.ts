import { readApiJson } from "@/lib/api/read-json";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";

export async function persistContactProfile(
  contactId: string,
  profile: ContactProfile
): Promise<{ contact?: ContactDetail; error?: string }> {
  const res = await fetch(`/api/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  const data = await readApiJson<{ contact?: ContactDetail; error?: string }>(
    res
  );

  if (!res.ok) {
    return { error: data.error ?? "Could not save changes" };
  }

  return { contact: data.contact };
}
