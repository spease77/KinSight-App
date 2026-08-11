import { supabase } from "@/lib/supabase/client";
import type { ContactProfile } from "@/types/contact-profile";
import { splitFullName } from "@/types/contact-profile";

export interface LinkedInEnrichmentResult {
  full_name: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company_name: string;
  location: string;
  summary: string;
}

type EnrichmentErrorBody = {
  error?: string;
};

export function isLinkedInUrl(url: string): boolean {
  return /linkedin\.com/i.test(url.trim());
}

export async function fetchLinkedInEnrichment(
  linkedinUrl: string
): Promise<LinkedInEnrichmentResult> {
  const trimmedUrl = linkedinUrl.trim();
  if (!trimmedUrl) {
    throw new Error("Enter a LinkedIn profile URL.");
  }

  const { data, error } = await supabase.functions.invoke("enrich-contact", {
    body: { linkedin_url: trimmedUrl },
  });

  if (error) {
    const httpError = error as {
      message?: string;
      context?: Response;
    };

    if (httpError.context) {
      try {
        const parsed = (await httpError.context.json()) as EnrichmentErrorBody;
        if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== error.message) {
          throw parseError;
        }
      }
    }

    throw new Error(error.message || "Could not fetch LinkedIn profile data.");
  }

  const payload = data as LinkedInEnrichmentResult & EnrichmentErrorBody;
  if (payload?.error) {
    throw new Error(payload.error);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("No profile data was returned.");
  }

  return payload;
}

function profileHasSavedName(
  profile: ContactProfile,
  lockedName?: { firstName?: string; lastName?: string }
): boolean {
  if (profile.firstName?.trim() || profile.lastName?.trim()) {
    return true;
  }

  return Boolean(lockedName?.firstName?.trim() || lockedName?.lastName?.trim());
}

export function applyLinkedInEnrichmentToProfile(
  current: ContactProfile,
  enriched: LinkedInEnrichmentResult,
  options: {
    preserveSavedName?: boolean;
    lockedName?: { firstName?: string; lastName?: string };
  } = {}
): ContactProfile {
  const preserveSavedName = options.preserveSavedName ?? true;
  const next: ContactProfile = { ...current };

  if (!preserveSavedName || !profileHasSavedName(current, options.lockedName)) {
    const firstName =
      enriched.first_name?.trim() ||
      splitFullName(enriched.full_name).firstName;
    const lastName =
      enriched.last_name?.trim() ||
      splitFullName(enriched.full_name).lastName;

    if (firstName) next.firstName = firstName;
    if (lastName) next.lastName = lastName;
  }

  if (enriched.company_name?.trim()) {
    next.companyName = enriched.company_name.trim();
  }
  if (enriched.location?.trim()) {
    next.companyCity = enriched.location.trim();
  }
  if (enriched.summary?.trim()) {
    next.businessOperations = enriched.summary.trim();
  }

  return next;
}
