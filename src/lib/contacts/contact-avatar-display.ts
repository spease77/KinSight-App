import type { Contact } from "@/types/contact";

export function resolveDisplayAvatarUrl(
  contact: Pick<Contact, "avatarUrl" | "enrichedAvatarUrl">
): string | undefined {
  const uploaded = contact.avatarUrl?.trim();
  if (uploaded) return uploaded;

  const enriched = contact.enrichedAvatarUrl?.trim();
  return enriched || undefined;
}
