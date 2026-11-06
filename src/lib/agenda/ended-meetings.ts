import {
  isLinkedContactId,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

export const DEBRIEF_BANNER_WINDOW_MS = 8 * 60 * 60 * 1000;
const DISMISS_STORAGE_KEY = "kinsight.debriefBanner.v1";

export function eventEndMs(interaction: ScheduledInteraction): number {
  const start = Date.parse(interaction.scheduledAt);
  if (!Number.isFinite(start)) return Number.NaN;
  const minutes =
    interaction.durationMinutes && interaction.durationMinutes > 0
      ? interaction.durationMinutes
      : 60;
  return start + minutes * 60_000;
}

export function isUpcomingBriefingWindow(
  interaction: Pick<ScheduledInteraction, "scheduledAt" | "durationMinutes">,
  now = Date.now()
): boolean {
  const start = Date.parse(interaction.scheduledAt);
  if (!Number.isFinite(start)) return false;
  const minutes =
    interaction.durationMinutes && interaction.durationMinutes > 0
      ? interaction.durationMinutes
      : 60;
  const end = start + minutes * 60_000;
  return start < now + 24 * 60 * 60 * 1000 && end > now - 30 * 60 * 1000;
}

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

export function dismissEndedMeeting(eventId: string): void {
  if (typeof window === "undefined") return;
  const next = { ...readDismissed(), [eventId]: Date.now() };
  window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(next));
}

export function recentlyEndedMeetings(
  interactions: ScheduledInteraction[],
  now = Date.now()
): ScheduledInteraction[] {
  const dismissed = readDismissed();
  return interactions
    .filter(
      (item) =>
        isLinkedContactId(item.contactId) && Boolean(item.contactName?.trim())
    )
    .filter((item) => {
      const end = eventEndMs(item);
      if (!Number.isFinite(end)) return false;
      if (end > now || now - end > DEBRIEF_BANNER_WINDOW_MS) return false;
      return !dismissed[item.id];
    })
    .sort((a, b) => eventEndMs(b) - eventEndMs(a));
}
