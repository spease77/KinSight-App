import { createServerSupabase } from "@/lib/supabase/server";
import { fetchInvestmentContactSummaries } from "@/lib/supabase/time-logs";
import { fetchUserSettings } from "@/lib/supabase/user-settings";
import {
  daysRemaining,
  isMaintenanceReminderDue,
  type MaintenanceReminderThreshold,
} from "@/lib/time-logs/maintenance";
import { dispatchMaintenanceReminder } from "@/lib/notifications/send-maintenance-reminder";
import type { Database } from "@/types/database";

type ContactReminderRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  "id" | "name" | "is_tracking_paused"
>;

export type MaintenanceReminderTarget = {
  contactId: string;
  contactName: string;
  totalMinutes: number;
  lastLoggedAt: string;
  daysRemaining: MaintenanceReminderThreshold;
};

async function hasReminderBeenSent(input: {
  contactId: string;
  threshold: MaintenanceReminderThreshold;
  lastLoggedAt: string;
}): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("maintenance_reminder_log")
    .select("id")
    .eq("contact_id", input.contactId)
    .eq("days_remaining_threshold", input.threshold)
    .eq("last_logged_at", input.lastLoggedAt)
    .maybeSingle();

  if (error) {
    console.warn("maintenance_reminder_log lookup error:", error.message);
    return false;
  }

  return Boolean(data);
}

async function recordReminderSent(input: {
  contactId: string;
  threshold: MaintenanceReminderThreshold;
  lastLoggedAt: string;
}): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("maintenance_reminder_log").insert({
    contact_id: input.contactId,
    days_remaining_threshold: input.threshold,
    last_logged_at: input.lastLoggedAt,
  } as never);

  if (error) {
    console.error("maintenance_reminder_log insert error:", error.message);
  }
}

export async function runMaintenanceReminderScan(): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const { settings, error: settingsError } = await fetchUserSettings();
  if (settingsError) {
    errors.push(settingsError);
  }

  if (!settings.globalNotificationsEnabled) {
    return { scanned: 0, sent: 0, skipped: 0, errors };
  }

  const supabase = createServerSupabase();
  const { data: contactRows, error: contactsError } = await supabase
    .from("contacts")
    .select("id, name, is_tracking_paused");

  if (contactsError) {
    return {
      scanned: 0,
      sent: 0,
      skipped: 0,
      errors: [contactsError.message],
    };
  }

  const rows = (contactRows ?? []) as ContactReminderRow[];

  const pausedById = new Map(
    rows.map((row) => [row.id, Boolean(row.is_tracking_paused)])
  );

  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  const { contacts: summaries, error: summaryError } =
    await fetchInvestmentContactSummaries();

  if (summaryError) {
    return { scanned: 0, sent: 0, skipped: 0, errors: [summaryError] };
  }

  const targets: MaintenanceReminderTarget[] = [];

  for (const summary of summaries) {
    if (summary.totalMinutes <= 0) {
      skipped += 1;
      continue;
    }

    if (pausedById.get(summary.contactId)) {
      skipped += 1;
      continue;
    }

    if (!summary.lastLoggedAt) {
      skipped += 1;
      continue;
    }

    const remaining = daysRemaining(summary.lastLoggedAt);
    if (!isMaintenanceReminderDue(remaining)) {
      continue;
    }

    targets.push({
      contactId: summary.contactId,
      contactName: nameById.get(summary.contactId) ?? summary.firstName,
      totalMinutes: summary.totalMinutes,
      lastLoggedAt: summary.lastLoggedAt,
      daysRemaining: remaining,
    });
  }

  for (const target of targets) {
    const alreadySent = await hasReminderBeenSent({
      contactId: target.contactId,
      threshold: target.daysRemaining,
      lastLoggedAt: target.lastLoggedAt,
    });

    if (alreadySent) {
      skipped += 1;
      continue;
    }

    const result = await dispatchMaintenanceReminder(target);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }

    await recordReminderSent({
      contactId: target.contactId,
      threshold: target.daysRemaining,
      lastLoggedAt: target.lastLoggedAt,
    });
    sent += 1;
  }

  return {
    scanned: summaries.length,
    sent,
    skipped,
    errors,
  };
}
