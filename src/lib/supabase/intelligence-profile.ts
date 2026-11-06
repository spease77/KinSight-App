import {
  INTELLIGENCE_PROFILE_KEY,
  parseIntelligenceProfile,
  type IntelligenceProfile,
} from "@/lib/contacts/intelligence-profile";
import { createServerSupabase } from "@/lib/supabase/server";
import { getContactRowById } from "@/lib/supabase/contacts";
import type { ContactProfile } from "@/types/contact-profile";

function isIntelligenceColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("intelligence_profile") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("column"))
  );
}

export async function readIntelligenceProfile(contactId: string): Promise<{
  profile: IntelligenceProfile | null;
  contactName: string;
  company: string;
  role: string;
  lastContact: string | null;
  contactProfile: ContactProfile;
} | null> {
  const row = await getContactRowById(contactId);
  if (!row) return null;

  const fromColumn = parseIntelligenceProfile(row.intelligence_profile);
  const fromMeta = parseIntelligenceProfile(
    row.profile?.[INTELLIGENCE_PROFILE_KEY]
  );

  return {
    profile: fromColumn ?? fromMeta,
    contactName: row.name,
    company: row.company ?? "",
    role: row.role ?? "",
    lastContact: row.last_meeting_date ?? row.last_contact ?? null,
    contactProfile: row.profile ?? {},
  };
}

export async function writeIntelligenceProfile(
  contactId: string,
  profile: IntelligenceProfile
): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("contacts")
    .update({ intelligence_profile: profile } as never)
    .eq("id", contactId);

  if (!error) return;

  if (!isIntelligenceColumnError(error.message)) {
    console.error("writeIntelligenceProfile error:", error.message);
    return;
  }

  const latest = await getContactRowById(contactId);
  if (!latest) return;

  const nextProfile: ContactProfile = {
    ...(latest.profile ?? {}),
    [INTELLIGENCE_PROFILE_KEY]: JSON.stringify(profile),
  };

  const fallback = await supabase
    .from("contacts")
    .update({ profile: nextProfile } as never)
    .eq("id", contactId);

  if (fallback.error) {
    console.error(
      "writeIntelligenceProfile profile fallback error:",
      fallback.error.message
    );
  }
}
