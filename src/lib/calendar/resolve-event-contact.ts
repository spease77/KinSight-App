import { rememberResolvedCalendarEvent } from "@/lib/calendar/calendar-events";
import {
  resolveContactFromRecords,
  type ContactResolutionRecord,
} from "@/lib/services/contactResolver";
import {
  isLinkedContactId,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";
import type { CalendarEventProvider } from "@/types/calendar-event";

export function attachResolvedContactToEvent(
  interaction: ScheduledInteraction,
  records: ContactResolutionRecord[],
  query: { name?: string | null; email?: string | null }
): ScheduledInteraction {
  const name = query.name?.trim();
  const email = query.email?.trim();
  if (!name && !email) return interaction;

  const resolved = resolveContactFromRecords(
    {
      name,
      email,
      eventTitle: interaction.title,
    },
    records
  );

  if (!resolved.contact_id || resolved.needs_confirmation) {
    return interaction;
  }

  const match = records.find((record) => record.id === resolved.contact_id);
  return {
    ...interaction,
    contactId: resolved.contact_id,
    contactName: match?.name || name || interaction.contactName,
  };
}

export function persistMatchedCalendarEvents(
  userId: string,
  provider: Exclude<CalendarEventProvider, "kinsight">,
  interactions: ScheduledInteraction[]
): void {
  const matched = interactions
    .filter(
      (item) =>
        isLinkedContactId(item.contactId) && Boolean(item.externalEventId)
    )
    .slice(0, 40);

  void Promise.all(
    matched.map((item) =>
      rememberResolvedCalendarEvent({
        userId,
        provider,
        externalEventId: item.externalEventId as string,
        calendarId: item.calendarId,
        contactId: item.contactId,
        title: item.title,
        startTime: item.scheduledAt,
        isOrganizer: item.isOrganizer,
        isReadOnly: item.isReadOnly,
      })
    )
  );
}
