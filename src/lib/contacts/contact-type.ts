export const CONTACT_TYPES = ["professional", "personal", "family"] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  professional: "Professional",
  personal: "Personal",
  family: "Family",
};

export function isContactType(value: unknown): value is ContactType {
  return (
    typeof value === "string" &&
    (CONTACT_TYPES as readonly string[]).includes(value)
  );
}

export function contactTypePillClass(
  type: ContactType,
  isActive: boolean
): string {
  return `contact-type-pill contact-type-pill--${type}${
    isActive ? " contact-type-pill--active" : ""
  }`;
}

export const KINSIGHT_PROFILE_CONTACT_TYPE = "__kinsightContactType";
export const KINSIGHT_PROFILE_CONTACT_TYPE_NEEDS_CONFIRMATION =
  "__kinsightContactTypeNeedsConfirmation";

export function readContactTypeFromProfile(
  profile?: Record<string, string | undefined> | null
): {
  contactType: ContactType | null;
  needsConfirmation: boolean;
} {
  const typeValue = profile?.[KINSIGHT_PROFILE_CONTACT_TYPE];
  const needsValue = profile?.[KINSIGHT_PROFILE_CONTACT_TYPE_NEEDS_CONFIRMATION];

  return {
    contactType: isContactType(typeValue) ? typeValue : null,
    needsConfirmation: needsValue === "true",
  };
}

export function buildContactTypeProfileMeta(
  contactType: ContactType | null,
  needsConfirmation: boolean
): Record<string, string> {
  const meta: Record<string, string> = {};

  if (contactType) {
    meta[KINSIGHT_PROFILE_CONTACT_TYPE] = contactType;
  }
  meta[KINSIGHT_PROFILE_CONTACT_TYPE_NEEDS_CONFIRMATION] = needsConfirmation
    ? "true"
    : "false";

  return meta;
}

export function isContactTypeSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("contact_type") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("column"))
  );
}

const FAMILY_PATTERN =
  /\b(wife|husband|spouse|daughter|son|mom|mother|dad|father|parent|parents|sister|brother|grandma|grandmother|grandpa|grandfather|aunt|uncle|cousin|in-law|inlaw|kid|kids|child|children)\b/i;

const PROFESSIONAL_PATTERN =
  /\b(at\s+[A-Z][\w&.-]+|with\s+[A-Z][\w&.-]+|client|prospect|customer|broker|partner|deal|quota|contract|strategy|ceo|cfo|vp|director|manager|president|sales|account|vendor|supplier|hotel|marriott|hilton|hyatt|consulting|corp|corporation|inc\.|llc|ltd)\b/i;

const PERSONAL_PATTERN =
  /\b(neighbor|friend|gym|golf|church|club|buddy|pal|met at|hang out|social|bbq|barbecue|pickup game|tennis|yoga|book club)\b/i;

const NAME_ONLY_PATTERN =
  /^(?:add|create|new|save)\s+[\w'.-]+(?:\s+[\w'.-]+){0,2}\.?$/i;

export function inferContactTypeHeuristic(
  transcript: string,
  hints?: {
    company?: string | null;
    role?: string | null;
  }
): { contactType: ContactType | null; needsConfirmation: boolean } {
  const text = transcript.trim();
  if (!text) {
    return { contactType: null, needsConfirmation: true };
  }

  if (FAMILY_PATTERN.test(text)) {
    return { contactType: "family", needsConfirmation: false };
  }

  if (
    hints?.company?.trim() ||
    hints?.role?.trim() ||
    PROFESSIONAL_PATTERN.test(text)
  ) {
    return { contactType: "professional", needsConfirmation: false };
  }

  if (PERSONAL_PATTERN.test(text)) {
    return { contactType: "personal", needsConfirmation: false };
  }

  if (NAME_ONLY_PATTERN.test(text)) {
    return { contactType: null, needsConfirmation: true };
  }

  return { contactType: null, needsConfirmation: true };
}

export function resolveContactTypeFromParse(input: {
  contact_type?: ContactType | null;
  contact_type_needs_confirmation?: boolean;
  transcript?: string;
  company?: string | null;
  role?: string | null;
}): { contactType: ContactType | null; needsConfirmation: boolean } {
  if (input.contact_type && isContactType(input.contact_type)) {
    return {
      contactType: input.contact_type,
      needsConfirmation: Boolean(input.contact_type_needs_confirmation),
    };
  }

  if (input.contact_type_needs_confirmation && !input.contact_type) {
    return { contactType: null, needsConfirmation: true };
  }

  if (input.transcript?.trim()) {
    return inferContactTypeHeuristic(input.transcript, {
      company: input.company,
      role: input.role,
    });
  }

  return { contactType: null, needsConfirmation: true };
}

export const CONTACT_TYPE_PARSE_INSTRUCTIONS = `CONTACT TYPE ROUTING (contact_type + contact_type_needs_confirmation):
- Set contact_type to "professional" when the note mentions a company (e.g. "at ABC Consulting", "with Shell"), job titles, or industry terms like broker, partner, deal, quota, contract, strategy, client, prospect, or vendor.
- Set contact_type to "family" when the note mentions immediate family: wife, husband, daughter, son, mom, dad, parent, spouse, sister, brother, or similar family relationship words.
- Set contact_type to "personal" for social connections without corporate or immediate-family signals (e.g. neighbor, friend from gym, met at the golf course).
- If multiple signals conflict, prefer family over personal, and professional over personal when work context is explicit.
- If the note is only a bare name with zero relationship context (e.g. "Add John Doe"), set contact_type to null and contact_type_needs_confirmation to true.
- Otherwise set contact_type_needs_confirmation to false when you assign a type with reasonable confidence.`;
