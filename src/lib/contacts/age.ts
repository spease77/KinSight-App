import type { ContactProfile } from "@/types/contact-profile";
import {
  KINSIGHT_LABELED_DATES_KEY,
  readLabeledDates,
} from "@/lib/contacts/labeled-contact-fields";
import type { ContactNoteEntry } from "@/lib/contacts/notes-log";

/**
 * Keeps a contact's age and birth year current without being asked.
 *
 * - Birthday with a year known  -> age is recomputed from it.
 * - Age + birthday (no year)    -> the birth year is worked out from when the age
 *                                  was recorded, then the age is recomputed.
 * - Age only                    -> the age goes up by one each year after it was recorded.
 *
 * Age and birthday written only in free-text notes ("Dad, 79 years old.
 * Birthday: August 19th.") are picked up too, using the note's own date.
 */

/** Stored as `YYYY-MM-DD:<age>` so a later edit of the age restarts the clock. */
export const KINSIGHT_AGE_RECORDED_AT_KEY = "__kinsightAgeRecordedAt";

const MIN_AGE = 0;
const MAX_AGE = 120;

interface Ymd {
  year: number;
  month: number;
  day: number;
}

interface MonthDay {
  month: number;
  day: number;
  year: number | null;
}

const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function toYmd(date: Date): Ymd {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  // 2000 is a leap year, so Feb 29 stays valid.
  const probe = new Date(Date.UTC(2000, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function expandTwoDigitYear(year: number, today: Ymd): number {
  if (year >= 100) return year;
  const twentieth = 2000 + year;
  return twentieth > today.year ? 1900 + year : twentieth;
}

/** `before(a, b)` is true when month/day `a` falls earlier in the year than `b`. */
function beforeInYear(
  a: { month: number; day: number },
  b: { month: number; day: number }
): boolean {
  return a.month < b.month || (a.month === b.month && a.day < b.day);
}

function parseNumericMonthDay(text: string, today: Ymd): MonthDay | null {
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidMonthDay(month, day)) return null;
    return { month, day, year: Number(iso[1]) };
  }

  const match = text.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!isValidMonthDay(month, day)) return null;

  const year = match[3] ? expandTwoDigitYear(Number(match[3]), today) : null;
  return { month, day, year };
}

const NAMED_MONTH_DAY = new RegExp(
  `\\b(${MONTH_NAMES})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
  "i"
);

function parseNamedMonthDay(text: string): MonthDay | null {
  const match = text.match(NAMED_MONTH_DAY);
  if (!match) return null;

  const month = MONTH_LOOKUP[match[1].toLowerCase()];
  const day = Number(match[2]);
  if (!month || !isValidMonthDay(month, day)) return null;

  return { month, day, year: match[3] ? Number(match[3]) : null };
}

/** Parses "08-19-1946", "8/19", "August 19th", "1946-08-19", ... */
export function parseBirthday(
  raw: string | undefined,
  today: Ymd = toYmd(new Date())
): MonthDay | null {
  const text = raw?.trim();
  if (!text) return null;
  return parseNumericMonthDay(text, today) ?? parseNamedMonthDay(text);
}

function parseAgeValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{1,3})(?:\s*(?:years?|yrs?)(?:\s*old)?)?$/i);
  if (!match) return null;
  const age = Number(match[1]);
  return age >= MIN_AGE && age <= MAX_AGE ? age : null;
}

function ageOn(birth: { year: number } & MonthDay, on: Ymd): number {
  return on.year - birth.year - (beforeInYear(on, birth) ? 1 : 0);
}

function birthYearFor(age: number, at: Ymd, birthday: MonthDay): number {
  return at.year - age - (beforeInYear(at, birthday) ? 1 : 0);
}

function parseRecordedAtMeta(
  raw: string | undefined
): { at: Ymd; age: number } | null {
  const match = raw?.trim().match(/^(\d{4})-(\d{2})-(\d{2}):(\d{1,3})$/);
  if (!match) return null;
  return {
    at: { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) },
    age: Number(match[4]),
  };
}

function formatRecordedAtMeta(at: Ymd, age: number): string {
  return `${at.year}-${pad(at.month)}-${pad(at.day)}:${age}`;
}

function formatBirthday(birth: { year: number } & MonthDay): string {
  return `${pad(birth.month)}-${pad(birth.day)}-${birth.year}`;
}

// ---------------------------------------------------------------------------
// Reading age / birthday out of free-text notes
// ---------------------------------------------------------------------------

/** "his son is 45" describes somebody else, not the contact. */
const OTHER_PERSON_PATTERN =
  /\b(?:his|her|their|my|your|\w+['’]s)\s+(?:(?:step|grand|great)[-\s]?)?(?:son|daughter|kid|kids|child|children|wife|husband|spouse|partner|mother|mom|father|dad|brother|sister|nephew|niece|cousin|aunt|uncle|friend|boss|neighbor|girlfriend|boyfriend|fianc\w+|grandson|granddaughter|grandchild)\b/i;

const AGE_PATTERNS: RegExp[] = [
  /\b(\d{1,3})[\s-]*(?:years?|yrs?)[\s-]*old\b/i,
  /\b(\d{1,3})[\s-]*(?:y\/o|yo)\b/i,
  /\bage[d]?\s*[:\-]?\s*(\d{1,3})\b/i,
  /\b(?:he|she|they)(?:['’]s|\s+is)\s+(\d{2,3})\b(?!\s*(?:%|percent|min|hour|hr|mile|day|week|month|year(?!s?\s*old)|pound|lb|dollar|\$|k\b))/i,
];

const BIRTHDAY_LEAD =
  /\b(?:birthday|birth\s*date|birthdate|b-?day|born(?:\s+on)?)\b\s*(?:is|was|on|:|-|=)?\s*/i;

export interface NoteAgeFacts {
  age: number | null;
  birthday: MonthDay | null;
}

export function extractAgeFactsFromText(
  text: string,
  today: Ymd = toYmd(new Date())
): NoteAgeFacts {
  let age: number | null = null;
  let birthday: MonthDay | null = null;

  const sentences = text
    .split(/[.!?]+(?:\s+|$)|[\n;]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (OTHER_PERSON_PATTERN.test(sentence)) continue;

    if (age === null) {
      for (const pattern of AGE_PATTERNS) {
        const match = sentence.match(pattern);
        if (!match) continue;
        const value = Number(match[1]);
        if (value >= MIN_AGE && value <= MAX_AGE) {
          age = value;
          break;
        }
      }
    }

    if (birthday === null) {
      const lead = sentence.match(BIRTHDAY_LEAD);
      if (lead && lead.index !== undefined) {
        const rest = sentence.slice(lead.index + lead[0].length);
        const numeric = rest.match(
          /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/\-.]\d{1,2}(?:[/\-.]\d{2,4})?)/
        );
        birthday =
          (numeric ? parseNumericMonthDay(numeric[1], today) : null) ??
          parseNamedMonthDay(rest);
      }
    }
  }

  return { age, birthday };
}

// ---------------------------------------------------------------------------
// Reconcile
// ---------------------------------------------------------------------------

export interface ReconcileAgeInput {
  profile: ContactProfile | undefined;
  notesLog?: ContactNoteEntry[];
  /** Used when an age exists but nothing says when it was entered. */
  fallbackRecordedAt?: string | null;
  now?: Date;
}

export interface ReconcileAgeResult {
  profile: ContactProfile;
  changed: boolean;
}

function patchLabeledBirthday(
  profile: ContactProfile,
  value: string
): ContactProfile {
  const raw = profile[KINSIGHT_LABELED_DATES_KEY];
  if (!raw?.trim()) return profile;

  const entries = readLabeledDates(profile);
  if (entries.length === 0) return profile;

  const existing = entries.find(
    (entry) => entry.label.trim().toLowerCase() === "birthday"
  );
  const next = existing
    ? entries.map((entry) =>
        entry === existing ? { ...entry, value } : entry
      )
    : [
        ...entries,
        { id: crypto.randomUUID(), label: "birthday", value },
      ];

  return { ...profile, [KINSIGHT_LABELED_DATES_KEY]: JSON.stringify(next) };
}

function readStoredBirthday(
  profile: ContactProfile,
  today: Ymd
): MonthDay | null {
  const fromField = parseBirthday(profile.birthDate, today);
  if (fromField) return fromField;

  const labeled = readLabeledDates(profile).find(
    (entry) => entry.label.trim().toLowerCase() === "birthday"
  );
  return parseBirthday(labeled?.value, today);
}

function findAgeInNotes(
  notes: ContactNoteEntry[],
  today: Ymd
): { age: number; at: Ymd; birthday: MonthDay | null } | null {
  const ordered = [...notes].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  for (const note of ordered) {
    const at = new Date(note.recordedAt);
    if (Number.isNaN(at.getTime())) continue;

    const facts = extractAgeFactsFromText(note.content, today);
    if (facts.age !== null) {
      return { age: facts.age, at: toYmd(at), birthday: facts.birthday };
    }
  }

  return null;
}

function findBirthdayInNotes(
  notes: ContactNoteEntry[],
  today: Ymd
): MonthDay | null {
  for (const note of notes) {
    const { birthday } = extractAgeFactsFromText(note.content, today);
    if (birthday) return birthday;
  }
  return null;
}

function addYears(at: Ymd, years: number): Ymd {
  return { year: at.year + years, month: at.month, day: at.day };
}

export function reconcileContactAge(
  input: ReconcileAgeInput
): ReconcileAgeResult {
  const original: ContactProfile = input.profile ?? {};
  const now = input.now ?? new Date();
  const today = toYmd(now);
  let profile: ContactProfile = { ...original };

  const storedAge = parseAgeValue(profile.age);
  const meta = parseRecordedAtMeta(profile[KINSIGHT_AGE_RECORDED_AT_KEY]);
  let birthday = readStoredBirthday(profile, today);

  const setAge = (age: number, recordedAt: Ymd) => {
    profile.age = String(age);
    profile[KINSIGHT_AGE_RECORDED_AT_KEY] = formatRecordedAtMeta(
      recordedAt,
      age
    );
  };

  const setBirthYear = (month: number, day: number, year: number) => {
    const formatted = formatBirthday({ month, day, year });
    profile.birthDate = formatted;
    profile = patchLabeledBirthday(profile, formatted);
  };

  // 1. A full birth date is the source of truth.
  if (birthday && birthday.year !== null) {
    const age = ageOn({ ...birthday, year: birthday.year }, today);
    if (age >= MIN_AGE && age <= MAX_AGE) {
      const metaCurrent = meta && meta.age === age;
      if (profile.age !== String(age) || !metaCurrent) setAge(age, today);
    }
    return finish(original, profile);
  }

  // 2. Work out where the age came from and when it was recorded.
  let age: number | null = null;
  let recordedAt: Ymd | null = null;

  if (storedAge !== null) {
    age = storedAge;
    if (meta && meta.age === storedAge) {
      recordedAt = meta.at;
    } else if (input.fallbackRecordedAt) {
      const fallback = new Date(input.fallbackRecordedAt);
      recordedAt = Number.isNaN(fallback.getTime()) ? today : toYmd(fallback);
    } else {
      recordedAt = today;
    }
  } else {
    const fromNotes = findAgeInNotes(input.notesLog ?? [], today);
    if (fromNotes) {
      age = fromNotes.age;
      recordedAt = fromNotes.at;
      birthday = birthday ?? fromNotes.birthday;
    }
  }

  if (age === null || recordedAt === null) {
    return finish(original, profile);
  }

  birthday = birthday ?? findBirthdayInNotes(input.notesLog ?? [], today);

  // 3a. Age + month/day -> the birth year, then the current age.
  if (birthday) {
    const year = birthYearFor(age, recordedAt, birthday);
    setBirthYear(birthday.month, birthday.day, year);
    const current = ageOn({ ...birthday, year }, today);
    if (current >= MIN_AGE && current <= MAX_AGE) {
      setAge(current, today);
    }
    return finish(original, profile);
  }

  // 3b. Age only -> add a year for every full year since it was entered.
  let years = today.year - recordedAt.year;
  if (beforeInYear(today, recordedAt)) years -= 1;

  if (years >= 1) {
    const nextAge = age + years;
    if (nextAge <= MAX_AGE) setAge(nextAge, addYears(recordedAt, years));
  } else {
    setAge(age, recordedAt);
  }

  return finish(original, profile);
}

function finish(
  original: ContactProfile,
  profile: ContactProfile
): ReconcileAgeResult {
  const keys = new Set([
    ...Object.keys(original),
    ...Object.keys(profile),
  ]) as Set<keyof ContactProfile>;

  for (const key of keys) {
    if ((original[key] ?? "") !== (profile[key] ?? "")) {
      return { profile, changed: true };
    }
  }

  return { profile: original, changed: false };
}
