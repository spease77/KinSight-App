export const CALENDAR_EVENT_PROVIDERS = [
  "google",
  "outlook",
  "kinsight",
] as const;

export type CalendarEventProvider = (typeof CALENDAR_EVENT_PROVIDERS)[number];

export const CALENDAR_SYNC_STATUSES = ["synced", "pending", "error"] as const;

export type CalendarSyncStatus = (typeof CALENDAR_SYNC_STATUSES)[number];

export function isCalendarSyncStatus(
  value: string | null | undefined
): value is CalendarSyncStatus {
  return (
    typeof value === "string" &&
    (CALENDAR_SYNC_STATUSES as readonly string[]).includes(value)
  );
}
