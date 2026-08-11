export function parseContactNameParts(
  name: string,
  profile?: { firstName?: string; lastName?: string } | null
): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = profile?.firstName?.trim() || parts[0] || "";
  const lastName =
    profile?.lastName?.trim() || parts.slice(1).join(" ") || "";

  return { firstName, lastName };
}

export function formatContactFullName(
  firstName: string,
  lastName: string,
  fallback = "Unknown"
): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || fallback;
}
