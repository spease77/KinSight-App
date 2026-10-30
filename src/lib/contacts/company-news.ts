import {
  collectContactEmails,
  inferCompanyDomain,
  isConsumerEmailDomain,
  normalizeHostname,
} from "@/lib/contacts/contact-avatar-inputs";
import {
  inferSocialMediaLabel,
  parseSocialMedia,
} from "@/lib/contacts/social-media";
import type { ContactProfile } from "@/types/contact-profile";

export const COMPANY_NEWS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPANY_NEWS_MAX_AGE_DAYS = 30;
export const COMPANY_NEWS_PROFILE_KEY = "__kinsightCompanyNews";

export type CompanyNewsResult = {
  has_news: boolean;
  headline: string;
  summary: string;
  date: string;
  source_url: string;
  strategic_icebreaker: string;
};

export type CompanyNewsRecord = CompanyNewsResult & {
  domain: string;
  companyName: string;
  fetched_at: string;
};

export const EMPTY_COMPANY_NEWS: CompanyNewsResult = {
  has_news: false,
  headline: "",
  summary: "",
  date: "",
  source_url: "",
  strategic_icebreaker: "",
};

export function parseCompanyNewsRecord(
  raw: unknown
): CompanyNewsRecord | null {
  if (!raw) return null;

  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.has_news !== "boolean") return null;
  if (typeof record.fetched_at !== "string" || !record.fetched_at.trim()) {
    return null;
  }

  return {
    has_news: record.has_news,
    headline: typeof record.headline === "string" ? record.headline : "",
    summary: typeof record.summary === "string" ? record.summary : "",
    date: typeof record.date === "string" ? record.date : "",
    source_url: typeof record.source_url === "string" ? record.source_url : "",
    strategic_icebreaker:
      typeof record.strategic_icebreaker === "string"
        ? record.strategic_icebreaker
        : "",
    domain: typeof record.domain === "string" ? record.domain : "",
    companyName:
      typeof record.companyName === "string" ? record.companyName : "",
    fetched_at: record.fetched_at,
  };
}

export function isCompanyNewsCacheFresh(
  cache: CompanyNewsRecord,
  input: { domain: string; companyName: string }
): boolean {
  const cachedAt = Date.parse(cache.fetched_at);
  if (!Number.isFinite(cachedAt)) return false;
  if (Date.now() - cachedAt > COMPANY_NEWS_CACHE_TTL_MS) return false;
  if ((cache.domain || "") !== (input.domain || "")) return false;
  if (
    cache.companyName.trim().toLowerCase() !==
    input.companyName.trim().toLowerCase()
  ) {
    return false;
  }
  return true;
}

export function websiteDomainFromProfile(
  profile: ContactProfile | null | undefined
): string | null {
  if (!profile) return null;
  const social = parseSocialMedia(profile.__kinsightSocialMedia);
  for (const entry of social) {
    const label = inferSocialMediaLabel(entry).toLowerCase();
    if (
      label === "linkedin" ||
      label === "twitter" ||
      label === "facebook" ||
      label === "instagram" ||
      label === "youtube"
    ) {
      continue;
    }
    const host = normalizeHostname(entry.url);
    if (host && !isConsumerEmailDomain(host) && !isSocialHostname(host)) {
      return host;
    }
  }
  return null;
}

export function resolveCompanyNewsDomain(input: {
  companyName?: string | null;
  contactEmail?: string | null;
  emails?: string[];
  companyWebsite?: string | null;
  company?: string | null;
}): string | null {
  return inferCompanyDomain({
    email: input.contactEmail,
    emails: input.emails,
    companyDomain: input.companyWebsite,
    company: input.company ?? input.companyName,
  });
}

export function resolveCompanyNewsInputs(input: {
  email?: string | null;
  company?: string | null;
  profile?: ContactProfile | null;
}): { emails: string[]; domain: string | null; companyName: string } {
  const emails = collectContactEmails({
    email: input.email,
    profile: input.profile,
  });
  const website = websiteDomainFromProfile(input.profile);
  const domain = resolveCompanyNewsDomain({
    companyName: input.company,
    contactEmail: emails[0],
    emails,
    companyWebsite: website,
    company: input.company,
  });

  return {
    emails,
    domain,
    companyName: input.company?.trim() || "",
  };
}

export function isNewsWithinWindow(
  rawDate: string,
  maxAgeDays = COMPANY_NEWS_MAX_AGE_DAYS
): boolean {
  const parsed = Date.parse(rawDate);
  if (!Number.isFinite(parsed)) return false;
  const ageMs = Date.now() - parsed;
  if (ageMs < -24 * 60 * 60 * 1000) return false;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function isSocialHostname(host: string): boolean {
  return (
    host === "linkedin.com" ||
    host.endsWith(".linkedin.com") ||
    host === "x.com" ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com") ||
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "instagram.com" ||
    host.endsWith(".instagram.com") ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com")
  );
}
