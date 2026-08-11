import { SOURCE_MARKER_REGEX } from "@/types/source-metadata";

const AGENDA_SIGNAL_PATTERNS = [
  /scheduled a reminder/i,
  /reminder to contact/i,
  /on your Agenda tab/i,
  /follow[- ]?up (at|on|for)/i,
  /set a (reminder|follow-up)/i,
  /log a reminder/i,
  /schedule(d)? (a |the )?(meeting|reminder)/i,
];

const CONTACT_SIGNAL_PATTERNS = [
  /I'll save (this )?for/i,
  /I(?:'ve| have) (saved|noted|remembered)/i,
  /saved (this|that) for/i,
  /Next time with /i,
  /birthday is/i,
  /anniversary is/i,
  /wife's name is/i,
  /husband's name is/i,
  /spouse/i,
  /company is/i,
  /works at/i,
  /contact details/i,
  /right person\?/i,
  /is that the right person/i,
];

export function messageHasLoggableIntelligence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (SOURCE_MARKER_REGEX.test(trimmed)) {
    SOURCE_MARKER_REGEX.lastIndex = 0;
    return true;
  }

  if (AGENDA_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (CONTACT_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  return false;
}
