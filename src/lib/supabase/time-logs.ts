import { parseContactNameParts } from "@/lib/contacts/parse-contact-name";
import { createServerSupabase } from "@/lib/supabase/server";
import type { InvestmentContactSummary, MeetingFormat } from "@/types/time-log";

type TimeLogRow = {
  contact_id: string;
  duration_minutes: number;
  logged_at: string;
  contacts: {
    id: string;
    name: string;
    profile: Record<string, string> | null;
  } | null;
};

function latestLoggedAt(current: string | null, candidate: string | null): string | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime()
    ? candidate
    : current;
}

export async function fetchInvestmentContactSummaries(): Promise<{
  contacts: InvestmentContactSummary[];
  error?: string;
}> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("time_logs")
    .select("contact_id, duration_minutes, logged_at, contacts(id, name, profile)");

  if (error) {
    console.error("time_logs summary error:", error.message);
    return { contacts: [], error: error.message };
  }

  const rows = (data ?? []) as TimeLogRow[];
  const byContact = new Map<string, InvestmentContactSummary>();

  for (const row of rows) {
    const contact = row.contacts;
    if (!contact) continue;

    const { firstName, lastName } = parseContactNameParts(
      contact.name,
      contact.profile
    );

    const existing = byContact.get(row.contact_id);
    if (existing) {
      existing.totalMinutes += row.duration_minutes;
      existing.lastLoggedAt = latestLoggedAt(
        existing.lastLoggedAt,
        row.logged_at
      );
      continue;
    }

    byContact.set(row.contact_id, {
      contactId: row.contact_id,
      firstName,
      lastName,
      totalMinutes: row.duration_minutes,
      lastLoggedAt: row.logged_at ?? null,
    });
  }

  return { contacts: Array.from(byContact.values()) };
}

export async function fetchContactTimeTotal(
  contactId: string
): Promise<{ totalMinutes: number; error?: string }> {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("time_logs")
      .select("duration_minutes")
      .eq("contact_id", contactId);

    if (error) {
      return { totalMinutes: 0, error: error.message };
    }

    const rows = (data ?? []) as { duration_minutes: number | null }[];
    const totalMinutes = rows.reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );

    return { totalMinutes };
  } catch (err) {
    return {
      totalMinutes: 0,
      error:
        err instanceof Error ? err.message : "Could not load time invested.",
    };
  }
}

export async function insertTimeLog(input: {
  contactId: string;
  durationMinutes: number;
  loggedAt?: string;
  notes?: string;
  meetingFormat?: MeetingFormat | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabase();

  const baseRow: {
    contact_id: string;
    duration_minutes: number;
    logged_at?: string;
    notes: string | null;
  } = {
    contact_id: input.contactId,
    duration_minutes: input.durationMinutes,
    notes: input.notes?.trim() || null,
  };

  if (input.loggedAt) {
    baseRow.logged_at = input.loggedAt;
  }

  const rowWithMeetingFormat = {
    ...baseRow,
    meeting_format: input.meetingFormat ?? null,
  };

  let { error } = await supabase
    .from("time_logs")
    .insert(rowWithMeetingFormat as never);

  if (error?.message.includes("meeting_format")) {
    ({ error } = await supabase.from("time_logs").insert(baseRow as never));
  }

  if (error) {
    console.error("time_logs insert error:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function insertTimeLogs(input: {
  contactIds: string[];
  durationMinutes: number;
  loggedAt?: string;
  notes?: string;
  meetingFormat?: MeetingFormat | null;
}): Promise<{ ok: boolean; error?: string }> {
  const uniqueContactIds = [...new Set(input.contactIds.map((id) => id.trim()))].filter(
    Boolean
  );

  if (uniqueContactIds.length === 0) {
    return { ok: false, error: "At least one contact is required." };
  }

  for (const contactId of uniqueContactIds) {
    const result = await insertTimeLog({
      contactId,
      durationMinutes: input.durationMinutes,
      loggedAt: input.loggedAt,
      notes: input.notes,
      meetingFormat: input.meetingFormat,
    });

    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}
