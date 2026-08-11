import type { MaintenanceReminderTarget } from "@/lib/supabase/maintenance-reminders";

const NOTIFICATION_TO =
  process.env.MAINTENANCE_NOTIFICATION_TO_EMAIL ??
  process.env.FEEDBACK_TO_EMAIL ??
  "scottpease77@gmail.com";
const NOTIFICATION_FROM =
  process.env.MAINTENANCE_NOTIFICATION_FROM_EMAIL ??
  process.env.FEEDBACK_FROM_EMAIL ??
  "KinSight <onboarding@resend.dev>";

function reminderCopy(target: MaintenanceReminderTarget): {
  title: string;
  body: string;
} {
  if (target.daysRemaining === 14) {
    return {
      title: `Touch base soon: ${target.contactName}`,
      body: `${target.contactName} has 14 days left in your 45-day maintenance window. Log a touchpoint to keep this relationship active.`,
    };
  }

  return {
    title: `Final reminder: ${target.contactName}`,
    body: `${target.contactName} has 5 days left before maintenance is overdue. Schedule a touch base now to protect your rapport score.`,
  };
}

async function sendMaintenanceEmail(
  target: MaintenanceReminderTarget
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Push/email hook skipped: RESEND_API_KEY is not configured for maintenance reminders.",
    };
  }

  const copy = reminderCopy(target);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFICATION_FROM,
      to: [NOTIFICATION_TO],
      subject: copy.title,
      text: copy.body,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    return {
      ok: false,
      error: body?.message ?? `Resend returned ${res.status}`,
    };
  }

  return { ok: true };
}

async function sendPushWebhook(
  target: MaintenanceReminderTarget
): Promise<{ ok: true } | { ok: false; error: string } | null> {
  const webhookUrl = process.env.MAINTENANCE_PUSH_WEBHOOK_URL;
  if (!webhookUrl) return null;

  const copy = reminderCopy(target);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "maintenance_reminder",
      contactId: target.contactId,
      contactName: target.contactName,
      daysRemaining: target.daysRemaining,
      title: copy.title,
      body: copy.body,
      totalMinutes: target.totalMinutes,
      lastLoggedAt: target.lastLoggedAt,
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      error: `Maintenance push webhook returned ${res.status}`,
    };
  }

  return { ok: true };
}

export async function dispatchMaintenanceReminder(
  target: MaintenanceReminderTarget
): Promise<{ ok: true } | { ok: false; error: string }> {
  const webhookResult = await sendPushWebhook(target);
  if (webhookResult?.ok) {
    return { ok: true };
  }

  if (webhookResult && !webhookResult.ok) {
    console.warn("Maintenance push webhook failed:", webhookResult.error);
  }

  const emailResult = await sendMaintenanceEmail(target);
  if (emailResult.ok) {
    return { ok: true };
  }

  if (webhookResult && !webhookResult.ok) {
    return { ok: false, error: webhookResult.error };
  }

  return emailResult;
}
