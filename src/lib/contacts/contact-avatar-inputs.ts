import { uniqueAliases } from "@/lib/contacts/contact-aliases";
import { emailsFromProfileFields } from "@/lib/contacts/contact-resolution";
import { readLabeledEmails } from "@/lib/contacts/labeled-contact-fields";
import type { ContactProfile } from "@/types/contact-profile";

const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "fastmail.com",
  "hey.com",
]);

export function extractEmailDomain(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return normalizeHostname(email.slice(at + 1));
}

export function isConsumerEmailDomain(domain: string): boolean {
  const host = normalizeHostname(domain);
  if (!host) return false;
  if (CONSUMER_EMAIL_DOMAINS.has(host)) return true;

  for (const consumer of CONSUMER_EMAIL_DOMAINS) {
    if (host.endsWith(`.${consumer}`)) return true;
  }

  return false;
}

export function normalizeHostname(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/\.+$/, "");
  if (!trimmed) return null;

  try {
    if (trimmed.includes("://")) {
      const host = new URL(trimmed).hostname.trim().toLowerCase();
      return host || null;
    }
  } catch {
    return null;
  }

  const withoutPath = trimmed.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  const host = withoutPath.replace(/^www\./, "").trim();
  if (!host || host.includes(" ") || !host.includes(".")) return null;
  return host;
}

export function collectContactEmails(input: {
  email?: string | null;
  profile?: ContactProfile | null;
}): string[] {
  const labeled = input.profile ? readLabeledEmails(input.profile) : [];
  return uniqueAliases([
    input.email,
    ...emailsFromProfileFields(input.profile ?? undefined),
    ...labeled.map((entry) => entry.value),
  ]).filter((value) => value.includes("@"));
}

export function inferCompanyDomain(input: {
  email?: string | null;
  emails?: string[];
  companyDomain?: string | null;
  company?: string | null;
}): string | null {
  const explicit = normalizeHostname(input.companyDomain ?? "");
  if (explicit && !isConsumerEmailDomain(explicit)) return explicit;

  const companyAsDomain = normalizeHostname(input.company ?? "");
  if (companyAsDomain && !isConsumerEmailDomain(companyAsDomain)) {
    return companyAsDomain;
  }

  const emails = uniqueAliases([input.email, ...(input.emails ?? [])]);
  for (const email of emails) {
    const domain = extractEmailDomain(email);
    if (domain && !isConsumerEmailDomain(domain)) return domain;
  }

  return null;
}
