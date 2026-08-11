import type { ScheduledInteraction } from "@/types/scheduled-interaction";

function atLocalTime(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function syncedAt(hoursAgo: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

/** Demo interactions for UI development until calendar OAuth is wired. */
export function getMockScheduledInteractions(): ScheduledInteraction[] {
  return [
    {
      id: "mock-agenda-kinsight-1",
      contactId: "mock-contact-1",
      contactName: "Denisse Pease",
      contactType: "professional",
      scheduledAt: atLocalTime(0, 10, 0),
      title: "Quarterly check-in",
      durationMinutes: 60,
      behavioralTags: [],
      notes: null,
      source: "kinsight",
      externalEventId: null,
      lastSyncedAt: null,
    },
    {
      id: "mock-agenda-google-1",
      contactId: "mock-contact-2",
      contactName: "Marcus Chen",
      contactType: "professional",
      scheduledAt: atLocalTime(0, 14, 30),
      title: "Product roadmap review",
      durationMinutes: 45,
      behavioralTags: [],
      notes: "Synced from Google Calendar",
      source: "google",
      externalEventId: "google_evt_8f2a91bc",
      lastSyncedAt: syncedAt(2),
    },
    {
      id: "mock-agenda-outlook-1",
      contactId: "mock-contact-3",
      contactName: "Sarah Whitfield",
      contactType: "personal",
      scheduledAt: atLocalTime(1, 9, 0),
      title: "Coffee catch-up",
      durationMinutes: 30,
      behavioralTags: [],
      notes: null,
      source: "outlook",
      externalEventId: "outlook_evt_a91d004e",
      lastSyncedAt: syncedAt(6),
    },
    {
      id: "mock-agenda-google-2",
      contactId: "mock-contact-4",
      contactName: "James Okonkwo",
      contactType: "family",
      scheduledAt: atLocalTime(2, 16, 0),
      title: "Family dinner planning",
      durationMinutes: 30,
      behavioralTags: [],
      notes: null,
      source: "google",
      externalEventId: "google_evt_44c0de12",
      lastSyncedAt: syncedAt(12),
    },
  ];
}

export function shouldUseMockAgendaInteractions(
  interactions: ScheduledInteraction[]
): boolean {
  return (
    process.env.NODE_ENV === "development" && interactions.length === 0
  );
}

export function resolveAgendaInteractions(
  interactions: ScheduledInteraction[]
): ScheduledInteraction[] {
  if (shouldUseMockAgendaInteractions(interactions)) {
    return getMockScheduledInteractions();
  }

  return interactions;
}
