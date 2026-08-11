export type CalendarAttendee = {
  email: string;
  displayName?: string;
};

export function isValidContactEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function normalizeContactEmail(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildCalendarAttendees(
  contactEmail: string | undefined,
  contactName: string
): CalendarAttendee[] {
  return buildCalendarAttendeesFromEmails(
    contactEmail ? [contactEmail] : [],
    contactName
  );
}

export function buildCalendarAttendeesFromEmails(
  emails: string[],
  contactName: string
): CalendarAttendee[] {
  const seen = new Set<string>();
  const attendees: CalendarAttendee[] = [];

  for (const value of emails) {
    const email = normalizeContactEmail(value);
    if (!email) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    attendees.push({ email, displayName: contactName });
  }

  return attendees;
}
