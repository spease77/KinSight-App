import { isSameCalendarDay } from "@/lib/agenda/time-frame";
import { formatAgendaEventTime } from "@/lib/agenda/time-frame";

export function formatSchedulePhrase(
  scheduledAt: string,
  reference = new Date()
): string {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return scheduledAt;
  }

  const time = formatAgendaEventTime(scheduledAt);
  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameCalendarDay(date, reference)) {
    return `today at ${time}`;
  }

  if (isSameCalendarDay(date, tomorrow)) {
    return `tomorrow at ${time}`;
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);

  return `${dateLabel} at ${time}`;
}

export function buildAgendaSuccessMessage(input: {
  contactName: string;
  scheduledAt: string;
  reference?: Date;
}): string {
  const when = formatSchedulePhrase(input.scheduledAt, input.reference);
  return `Done. I've scheduled a reminder to contact ${input.contactName} ${when}. You can view this on your Agenda tab.`;
}
