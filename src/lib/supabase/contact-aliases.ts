import {
  mergeAliasLists,
  readProfileAliases,
  writeProfileAliases,
} from "@/lib/contacts/contact-aliases";
import { createServerSupabase } from "@/lib/supabase/server";
import { sanitizeContactProfile } from "@/types/contact-profile";

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

export async function appendContactAlias(
  contactId: string,
  spokenName: string
): Promise<{ aliases: string[]; error?: string }> {
  const trimmed = spokenName.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { aliases: [], error: "Name is required" };
  }

  const supabase = createServerSupabase();
  const existing = await supabase
    .from("contacts")
    .select("id, name, aliases, profile")
    .eq("id", contactId)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return {
      aliases: [],
      error: existing.error?.message ?? "Contact not found",
    };
  }

  const row = existing.data as {
    name?: string;
    aliases?: string[] | null;
    profile?: Record<string, string> | null;
  };

  const profile = sanitizeContactProfile(row.profile ?? {});
  const aliases = mergeAliasLists(row.aliases, readProfileAliases(profile), [
    trimmed,
  ]).filter(
    (alias) => alias.toLowerCase() !== (row.name ?? "").trim().toLowerCase()
  );
  const nextProfile = writeProfileAliases(profile, aliases);
  const payload = {
    aliases,
    profile: nextProfile,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from("contacts")
    .update(payload as never)
    .eq("id", contactId)
    .select("aliases")
    .single();

  if (result.error && isMissingColumnError(result.error.message)) {
    result = await supabase
      .from("contacts")
      .update({
        profile: nextProfile,
        updated_at: payload.updated_at,
      } as never)
      .eq("id", contactId)
      .select("id")
      .single();
  }

  if (result.error) {
    return { aliases, error: result.error.message };
  }

  return { aliases };
}
