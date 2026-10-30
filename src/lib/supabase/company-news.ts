import {
  COMPANY_NEWS_PROFILE_KEY,
  isCompanyNewsCacheFresh,
  parseCompanyNewsRecord,
  resolveCompanyNewsInputs,
  type CompanyNewsRecord,
} from "@/lib/contacts/company-news";
import { createServerSupabase } from "@/lib/supabase/server";
import { getContactRowById } from "@/lib/supabase/contacts";
import type { ContactProfile } from "@/types/contact-profile";

function isCompanyNewsColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("company_news") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("column"))
  );
}

export async function readCompanyNewsCache(contactId: string): Promise<{
  cache: CompanyNewsRecord | null;
  domain: string | null;
  companyName: string;
  emails: string[];
  profile: ContactProfile;
} | null> {
  const row = await getContactRowById(contactId);
  if (!row) return null;

  const inputs = resolveCompanyNewsInputs({
    email: row.email,
    company: row.company,
    profile: row.profile,
  });

  const fromColumn = parseCompanyNewsRecord(row.company_news);
  const fromProfile = parseCompanyNewsRecord(
    row.profile?.[COMPANY_NEWS_PROFILE_KEY]
  );
  const cache = fromColumn ?? fromProfile;

  return {
    cache,
    domain: inputs.domain,
    companyName: inputs.companyName,
    emails: inputs.emails,
    profile: row.profile ?? {},
  };
}

export async function writeCompanyNewsCache(
  contactId: string,
  cache: CompanyNewsRecord
): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("contacts")
    .update({ company_news: cache } as never)
    .eq("id", contactId);

  if (!error) return;

  if (!isCompanyNewsColumnError(error.message)) {
    console.error("writeCompanyNewsCache error:", error.message);
    return;
  }

  const latest = await getContactRowById(contactId);
  if (!latest) return;

  const nextProfile: ContactProfile = {
    ...(latest.profile ?? {}),
    [COMPANY_NEWS_PROFILE_KEY]: JSON.stringify(cache),
  };

  const fallback = await supabase
    .from("contacts")
    .update({ profile: nextProfile } as never)
    .eq("id", contactId);

  if (fallback.error) {
    console.error(
      "writeCompanyNewsCache profile fallback error:",
      fallback.error.message
    );
  }
}

export function cachedNewsIfFresh(
  cache: CompanyNewsRecord | null,
  domain: string | null,
  companyName: string
): CompanyNewsRecord | null {
  if (!cache || !domain) return null;
  if (!isCompanyNewsCacheFresh(cache, { domain, companyName })) return null;
  return cache;
}
