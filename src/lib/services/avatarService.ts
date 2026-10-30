import { createHash } from "node:crypto";
import {
  extractEmailDomain,
  inferCompanyDomain,
  isConsumerEmailDomain,
  normalizeHostname,
} from "@/lib/contacts/contact-avatar-inputs";

export const ENRICHED_AVATAR_CACHE_KEY = "__kinsightEnrichedAvatar";
export const ENRICHED_AVATAR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type EnrichedAvatarSource = "gravatar" | "logo" | "none";

export type EnrichedAvatarCache = {
  url: string | null;
  source: EnrichedAvatarSource;
  at: string;
  email?: string;
  domain?: string;
};

const IMAGE_PROBE_TIMEOUT_MS = 1_800;

export function gravatarHashForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("md5").update(normalized).digest("hex");
}

export function gravatarAvatarUrl(email: string, size = 256): string {
  const hash = gravatarHashForEmail(email);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export function parseEnrichedAvatarCache(
  raw: string | null | undefined
): EnrichedAvatarCache | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EnrichedAvatarCache>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.source !== "gravatar" && parsed.source !== "logo" && parsed.source !== "none") {
      return null;
    }
    if (typeof parsed.at !== "string" || !parsed.at.trim()) return null;
    const url =
      typeof parsed.url === "string" && parsed.url.trim() ? parsed.url.trim() : null;
    return {
      url,
      source: parsed.source,
      at: parsed.at,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      domain: typeof parsed.domain === "string" ? parsed.domain : undefined,
    };
  } catch {
    return null;
  }
}

export function isEnrichedAvatarCacheFresh(
  cache: EnrichedAvatarCache,
  input: { email?: string | null; companyDomain?: string | null }
): boolean {
  const cachedAt = Date.parse(cache.at);
  if (!Number.isFinite(cachedAt)) return false;
  if (Date.now() - cachedAt > ENRICHED_AVATAR_CACHE_TTL_MS) return false;

  const email = input.email?.trim().toLowerCase() || "";
  const domain = inferCompanyDomain({
    email: input.email,
    companyDomain: input.companyDomain,
  });

  if ((cache.email ?? "") !== email) return false;
  if ((cache.domain ?? "") !== (domain ?? "")) return false;
  return true;
}

async function isImageReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_PROBE_TIMEOUT_MS);

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "image/*" },
      cache: "no-store",
    });

    if (head.status === 405 || head.status === 501) {
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Accept: "image/*" },
        cache: "no-store",
      });
      return get.status === 200;
    }

    return head.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function logoDevUrl(domain: string, token: string): string {
  const params = new URLSearchParams({
    token,
    format: "png",
    size: "256",
    retina: "true",
  });
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

function brandfetchUrl(domain: string, clientId?: string): string {
  const params = clientId ? `?c=${encodeURIComponent(clientId)}` : "";
  return `https://cdn.brandfetch.io/${encodeURIComponent(domain)}/fallback/404/w/256/h/256${params}`;
}

async function lookupCompanyLogo(domain: string): Promise<string | null> {
  const host = normalizeHostname(domain);
  if (!host || isConsumerEmailDomain(host)) return null;

  const logoDevToken = process.env.LOGO_DEV_TOKEN?.trim();
  if (logoDevToken) {
    const url = logoDevUrl(host, logoDevToken);
    if (await isImageReachable(url)) return url;
  }

  const brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID?.trim();
  const fallback = brandfetchUrl(host, brandfetchClientId);
  if (await isImageReachable(fallback)) return fallback;

  return null;
}

/**
 * Three-pass contact avatar lookup:
 * 1. Gravatar for the email (404 if none)
 * 2. Company logo via Logo.dev, then Brandfetch, for business domains
 * 3. null so the UI can render initials
 */
export async function getContactAvatar(input: {
  email?: string | null;
  companyDomain?: string | null;
}): Promise<string | null> {
  const email = input.email?.trim().toLowerCase() || "";

  if (email.includes("@")) {
    const gravatarUrl = gravatarAvatarUrl(email);
    if (await isImageReachable(gravatarUrl)) {
      return gravatarUrl;
    }
  }

  const domain = inferCompanyDomain({
    email,
    companyDomain: input.companyDomain,
  });
  if (domain) {
    const logoUrl = await lookupCompanyLogo(domain);
    if (logoUrl) return logoUrl;
  }

  return null;
}

export function serializeEnrichedAvatarCache(
  cache: EnrichedAvatarCache
): string {
  return JSON.stringify(cache);
}

export { extractEmailDomain, inferCompanyDomain, isConsumerEmailDomain };
