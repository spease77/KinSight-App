export const KINSIGHT_SOCIAL_MEDIA_KEY = "__kinsightSocialMedia";

export interface SocialMediaEntry {
  id: string;
  url: string;
  label?: string;
}

export function createEmptySocialMediaEntry(): SocialMediaEntry {
  return {
    id: crypto.randomUUID(),
    url: "",
  };
}

export function normalizeSocialMediaUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSocialMediaDisplayText(entry: SocialMediaEntry): string {
  const label = entry.label?.trim();
  if (label) return label;
  return entry.url.trim();
}

export function getSocialMediaSubtitle(entry: SocialMediaEntry): string | null {
  const label = entry.label?.trim();
  const url = entry.url.trim();
  if (label && url) return url;
  return null;
}

export function dedupeSocialMediaEntries(
  entries: SocialMediaEntry[]
): SocialMediaEntry[] {
  const seen = new Set<string>();
  const deduped: SocialMediaEntry[] = [];

  for (const entry of entries) {
    const url = normalizeSocialMediaUrl(entry.url).toLowerCase();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    deduped.push(entry);
  }

  return deduped;
}

export function inferSocialMediaLabel(entry: SocialMediaEntry): string {
  const explicit = entry.label?.trim();
  if (explicit) return explicit;

  try {
    const hostname = new URL(normalizeSocialMediaUrl(entry.url)).hostname
      .replace(/^www\./i, "")
      .toLowerCase();

    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("twitter") || hostname === "x.com") return "Twitter";
    if (hostname.includes("facebook")) return "Facebook";
    if (hostname.includes("instagram")) return "Instagram";
    if (hostname.includes("youtube")) return "YouTube";
    return "Website";
  } catch {
    return "Link";
  }
}

export function formatSocialMediaLinkDisplay(entry: SocialMediaEntry): string {
  const raw = entry.url.trim();
  if (!raw) return "";

  try {
    const parsed = new URL(normalizeSocialMediaUrl(raw));
    const host = parsed.hostname.replace(/^www\./i, "");
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, "");
    return `${host}${path}` || host;
  } catch {
    return raw;
  }
}

export function sortSocialMediaEntries(
  entries: SocialMediaEntry[]
): SocialMediaEntry[] {
  return [...entries].sort((a, b) => {
    const textA = getSocialMediaDisplayText(a).toLowerCase();
    const textB = getSocialMediaDisplayText(b).toLowerCase();
    return textA.localeCompare(textB, undefined, { sensitivity: "base" });
  });
}

export function parseSocialMedia(raw: unknown): SocialMediaEntry[] {
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const entries: SocialMediaEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url =
      typeof record.url === "string" ? normalizeSocialMediaUrl(record.url) : "";
    if (!url) continue;

    const entry: SocialMediaEntry = {
      id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
      url,
    };

    if (typeof record.label === "string" && record.label.trim()) {
      entry.label = record.label.trim();
    }

    entries.push(entry);
  }

  return entries;
}

function serializeEntry(entry: SocialMediaEntry): Record<string, string> | null {
  const url = normalizeSocialMediaUrl(entry.url);
  if (!url) return null;

  const base: Record<string, string> = {
    id: entry.id,
    url,
  };

  if (entry.label?.trim()) {
    base.label = entry.label.trim();
  }

  return base;
}

export function serializeSocialMedia(entries: SocialMediaEntry[]): string {
  const cleaned = entries
    .map((entry) => serializeEntry(entry))
    .filter((entry): entry is Record<string, string> => entry !== null);

  return JSON.stringify(cleaned);
}

export function validateSocialMediaEntry(entry: SocialMediaEntry): string | null {
  const url = entry.url.trim();
  if (!url) return "URL is required.";

  try {
    const normalized = normalizeSocialMediaUrl(url);
    const parsed = new URL(normalized);
    if (!parsed.hostname) return "Enter a valid URL.";
  } catch {
    return "Enter a valid URL.";
  }

  return null;
}

export function socialMediaFromProfile(
  profile: Record<string, unknown> | undefined
): SocialMediaEntry[] {
  if (!profile) return [];
  return parseSocialMedia(profile[KINSIGHT_SOCIAL_MEDIA_KEY]);
}
