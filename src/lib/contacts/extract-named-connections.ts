import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import {
  filterUserAuthoredNotes,
  type ContactNoteEntry,
} from "@/lib/contacts/notes-log";
import {
  findDuplicateConnectionIndex,
  mergeConnectionFacts,
  personToRelationshipEntry,
} from "@/lib/contacts/proposed-connection";
import {
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
  serializeRelationshipTree,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";
import {
  splitFullName,
  type ContactProfile,
} from "@/types/contact-profile";

export type ExtractedNamedConnection = {
  firstName: string;
  lastName: string;
  relationshipLabel: string;
  facts: string[];
};

const NAME_TOKEN = String.raw`[A-Za-z][A-Za-z.''-]*`;
const PERSON_NAME = String.raw`${NAME_TOKEN}(?:\s+${NAME_TOKEN}){0,2}`;

const NAME_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "to",
  "of",
  "or",
  "both",
  "two",
  "adult",
  "adults",
  "child",
  "children",
  "kids",
  "son",
  "daughter",
  "wife",
  "husband",
  "spouse",
  "partner",
  "family",
  "college",
  "out",
  "owns",
  "named",
  "called",
  "his",
  "her",
  "their",
  "who",
  "that",
  "with",
  "from",
  "about",
]);

const MALE_FIRST_NAMES = new Set([
  "aaron",
  "adam",
  "alex",
  "andrew",
  "anthony",
  "benjamin",
  "bill",
  "bob",
  "brian",
  "charles",
  "chris",
  "chuck",
  "dan",
  "daniel",
  "david",
  "edward",
  "eric",
  "frank",
  "george",
  "james",
  "jason",
  "jeff",
  "john",
  "joseph",
  "josh",
  "kevin",
  "mark",
  "matt",
  "matthew",
  "michael",
  "mike",
  "nick",
  "paul",
  "peter",
  "richard",
  "robert",
  "ryan",
  "sam",
  "scott",
  "steve",
  "steven",
  "thomas",
  "tim",
  "tom",
  "william",
]);

const FEMALE_FIRST_NAMES = new Set([
  "amanda",
  "amy",
  "anna",
  "ashley",
  "barbara",
  "betty",
  "brenda",
  "carol",
  "catherine",
  "christine",
  "deborah",
  "denisse",
  "donna",
  "elizabeth",
  "emily",
  "emma",
  "helen",
  "jennifer",
  "jessica",
  "julie",
  "karen",
  "kathleen",
  "kim",
  "laura",
  "linda",
  "lisa",
  "margaret",
  "maria",
  "mary",
  "melissa",
  "michelle",
  "nancy",
  "nicole",
  "patricia",
  "rachel",
  "rebecca",
  "sandra",
  "sarah",
  "sharon",
  "stephanie",
  "stacy",
  "stacey",
  "susan",
]);

const RELATIONSHIP_TERMS: Array<{ pattern: string; label: string }> = [
  { pattern: "mother-in-law|mom-in-law", label: "mother-in-law" },
  { pattern: "father-in-law|dad-in-law", label: "father-in-law" },
  { pattern: "sister-in-law", label: "sister-in-law" },
  { pattern: "brother-in-law", label: "brother-in-law" },
  { pattern: "daughter-in-law", label: "daughter-in-law" },
  { pattern: "son-in-law", label: "son-in-law" },
  { pattern: "stepmother|step-mom|stepmom", label: "stepmother" },
  { pattern: "stepfather|step-dad|stepdad", label: "stepfather" },
  { pattern: "granddaughter", label: "granddaughter" },
  { pattern: "grandson", label: "grandson" },
  { pattern: "grandmother|grandma|nana", label: "grandmother" },
  { pattern: "grandfather|grandpa", label: "grandfather" },
  { pattern: "assistant|gatekeeper|ea\\b|executive assistant", label: "assistant" },
  { pattern: "colleague|coworker|co-worker", label: "colleague" },
  { pattern: "girlfriend", label: "girlfriend" },
  { pattern: "boyfriend", label: "boyfriend" },
  { pattern: "fiancee|fiancée|fiance|fiancé", label: "fiancé" },
  { pattern: "partner|spouse", label: "spouse" },
  { pattern: "wife", label: "wife" },
  { pattern: "husband", label: "husband" },
  { pattern: "daughter", label: "daughter" },
  { pattern: "son", label: "son" },
  { pattern: "mother|mom", label: "mother" },
  { pattern: "father|dad", label: "father" },
  { pattern: "sister", label: "sister" },
  { pattern: "brother", label: "brother" },
  { pattern: "aunt", label: "aunt" },
  { pattern: "uncle", label: "uncle" },
  { pattern: "cousin", label: "cousin" },
  { pattern: "niece", label: "niece" },
  { pattern: "nephew", label: "nephew" },
  { pattern: "friend", label: "friend" },
  { pattern: "manager|boss", label: "manager" },
];

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function looksLikePersonName(value: string): boolean {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.,;:]+$/g, ""))
    .filter(Boolean);

  if (parts.length === 0 || parts.length > 3) return false;

  return parts.every((part) => {
    const key = part.toLowerCase();
    if (NAME_STOPWORDS.has(key)) return false;
    return /^[A-Za-z][A-Za-z.''-]*$/.test(part);
  });
}

function parsePersonName(
  raw: string,
  anchorName?: string
): { firstName: string; lastName: string } | null {
  const cleaned = raw.replace(/[.,;:]+$/g, "").trim();
  if (!looksLikePersonName(cleaned)) return null;

  const { firstName, lastName } = splitFullName(titleCaseName(cleaned));
  if (!firstName) return null;

  const display = [firstName, lastName].filter(Boolean).join(" ");
  if (
    anchorName &&
    display.toLowerCase() === anchorName.trim().toLowerCase()
  ) {
    return null;
  }

  const anchorFirst = splitFullName(anchorName ?? "").firstName.toLowerCase();
  if (anchorFirst && firstName.toLowerCase() === anchorFirst && !lastName) {
    return null;
  }

  return { firstName, lastName };
}

function inferSpouseLabel(input: {
  contactName?: string;
  nearbyText: string;
}): string {
  const nearby = input.nearbyText.toLowerCase();
  if (/\b(his|wife)\b/.test(nearby)) return "wife";
  if (/\b(her|husband)\b/.test(nearby)) return "husband";

  const first = splitFullName(input.contactName ?? "").firstName.toLowerCase();
  if (MALE_FIRST_NAMES.has(first)) return "wife";
  if (FEMALE_FIRST_NAMES.has(first)) return "husband";
  return "spouse";
}

function inferChildLabel(firstName: string, nearbyText: string): string {
  const nearby = nearbyText.toLowerCase();
  if (/\bdaughter\b/.test(nearby)) return "daughter";
  if (/\bson\b/.test(nearby)) return "son";
  const key = firstName.toLowerCase();
  if (MALE_FIRST_NAMES.has(key)) return "son";
  if (FEMALE_FIRST_NAMES.has(key)) return "daughter";
  return "child";
}

function pushUnique(
  bucket: ExtractedNamedConnection[],
  incoming: ExtractedNamedConnection
) {
  const first = incoming.firstName.toLowerCase();
  const last = incoming.lastName.toLowerCase();
  const existing = bucket.find((item) => {
    if (item.firstName.toLowerCase() !== first) return false;
    if (!item.lastName || !last) return true;
    return item.lastName.toLowerCase() === last;
  });

  if (!existing) {
    bucket.push(incoming);
    return;
  }

  if (incoming.lastName && incoming.lastName.length > existing.lastName.length) {
    existing.lastName = incoming.lastName;
  }
  if (
    incoming.relationshipLabel !== "spouse" &&
    incoming.relationshipLabel !== "child" &&
    (existing.relationshipLabel === "spouse" ||
      existing.relationshipLabel === "child" ||
      existing.relationshipLabel === "other")
  ) {
    existing.relationshipLabel = incoming.relationshipLabel;
  }
  existing.facts = [
    ...existing.facts,
    ...incoming.facts.filter((fact) => !existing.facts.includes(fact)),
  ];
}

function extractFromPattern(
  text: string,
  regex: RegExp,
  resolve: (match: RegExpExecArray) => ExtractedNamedConnection | null,
  bucket: ExtractedNamedConnection[]
) {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const extracted = resolve(match);
    if (extracted) pushUnique(bucket, extracted);
  }
}

export function extractNamedConnectionsFromText(
  text: string,
  options?: { contactName?: string }
): ExtractedNamedConnection[] {
  const source = text.trim();
  if (!source) return [];

  const bucket: ExtractedNamedConnection[] = [];
  const contactName = options?.contactName?.trim();
  const contactFirst = splitFullName(contactName ?? "").firstName;
  const relationshipAlt = RELATIONSHIP_TERMS.map((term) => term.pattern).join("|");

  const labelForTerm = (raw: string): string => {
    const value = raw.trim().toLowerCase();
    const match = RELATIONSHIP_TERMS.find((term) =>
      new RegExp(`^(?:${term.pattern})$`, "i").test(value)
    );
    return match?.label ?? value;
  };

  extractFromPattern(
    source,
    new RegExp(
      String.raw`\bmarried(?:\s+to)?\s+(${PERSON_NAME})`,
      "gi"
    ),
    (match) => {
      const parsed = parsePersonName(match[1], contactName);
      if (!parsed) return null;
      const start = Math.max(0, match.index - 40);
      const nearby = source.slice(start, match.index + match[0].length);
      return {
        ...parsed,
        relationshipLabel: inferSpouseLabel({
          contactName,
          nearbyText: nearby,
        }),
        facts: [],
      };
    },
    bucket
  );

  extractFromPattern(
    source,
    new RegExp(
      String.raw`\b(?:his|her|their)\s+(${relationshipAlt})\s+(?:named\s+|is\s+|called\s+)?(${PERSON_NAME})`,
      "gi"
    ),
    (match) => {
      const parsed = parsePersonName(match[2], contactName);
      if (!parsed) return null;
      return {
        ...parsed,
        relationshipLabel: labelForTerm(match[1]),
        facts: [],
      };
    },
    bucket
  );

  if (contactFirst) {
    extractFromPattern(
      source,
      new RegExp(
        String.raw`\b${contactFirst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:'s)?\s+(${relationshipAlt})\s+(?:named\s+|is\s+|called\s+)?(${PERSON_NAME})`,
        "gi"
      ),
      (match) => {
        const parsed = parsePersonName(match[2], contactName);
        if (!parsed) return null;
        return {
          ...parsed,
          relationshipLabel: labelForTerm(match[1]),
          facts: [],
        };
      },
      bucket
    );
  }

  extractFromPattern(
    source,
    new RegExp(
      String.raw`\b(${relationshipAlt})\s+(?:named\s+|is\s+|called\s+)?(${PERSON_NAME})`,
      "gi"
    ),
    (match) => {
      const parsed = parsePersonName(match[2], contactName);
      if (!parsed) return null;
      return {
        ...parsed,
        relationshipLabel: labelForTerm(match[1]),
        facts: [],
      };
    },
    bucket
  );

  extractFromPattern(
    source,
    new RegExp(
      String.raw`\b(${PERSON_NAME})\s*[\u2014\-–:,]\s*(${relationshipAlt})\b`,
      "gi"
    ),
    (match) => {
      const parsed = parsePersonName(match[1], contactName);
      if (!parsed) return null;
      return {
        ...parsed,
        relationshipLabel: labelForTerm(match[2]),
        facts: [],
      };
    },
    bucket
  );

  return bucket;
}

function connectionsFromProfileFields(
  profile: ContactProfile,
  contactName?: string
): ExtractedNamedConnection[] {
  const bucket: ExtractedNamedConnection[] = [];
  const spouseFirst = profile.spouseFirstName?.trim();
  if (spouseFirst) {
    const parsed = parsePersonName(
      [spouseFirst, profile.spouseLastName?.trim()]
        .filter(Boolean)
        .join(" "),
      contactName
    );
    if (parsed) {
      const facts = [
        profile.spouseEducation?.trim(),
        profile.spouseInterests?.trim(),
      ].filter((value): value is string => Boolean(value));
      pushUnique(bucket, {
        ...parsed,
        relationshipLabel: inferSpouseLabel({
          contactName,
          nearbyText: profile.maritalStatus ?? "",
        }),
        facts,
      });
    }
  }

  const children: Array<{ name?: string; age?: string }> = [
    { name: profile.child1Name, age: profile.child1Age },
    { name: profile.child2Name, age: profile.child2Age },
    { name: profile.child3Name, age: profile.child3Age },
  ];

  for (const child of children) {
    const raw = child.name?.trim();
    if (!raw || !looksLikePersonName(raw)) continue;
    const parsed = parsePersonName(raw, contactName);
    if (!parsed) continue;
    const facts = child.age?.trim() ? [`Age: ${child.age.trim()}`] : [];
    pushUnique(bucket, {
      ...parsed,
      relationshipLabel: inferChildLabel(parsed.firstName, raw),
      facts,
    });
  }

  return bucket;
}

export function extractedConnectionToPerson(
  extracted: ExtractedNamedConnection,
  contactName: string
): ParsedProposedPerson {
  const displayName = [extracted.firstName, extracted.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    displayName,
    firstName: extracted.firstName,
    lastName: extracted.lastName || undefined,
    notes: extracted.facts.join("\n") || undefined,
    relationshipHint: `${extracted.relationshipLabel} of ${contactName}`,
    recordAs: "connection",
    connectionAnchorName: contactName,
    profile: {
      firstName: extracted.firstName,
      ...(extracted.lastName ? { lastName: extracted.lastName } : {}),
    },
    sourceSnippets: {},
  };
}

function mergeExtractedIntoTree(
  tree: RelationshipTreeEntry[],
  extracted: ExtractedNamedConnection[],
  contactName: string
): RelationshipTreeEntry[] {
  let next = [...tree];

  for (const item of extracted) {
    const person = extractedConnectionToPerson(item, contactName);
    const candidate = personToRelationshipEntry(person);
    if (!candidate.firstName.trim()) continue;

    const duplicateIndex = findDuplicateConnectionIndex(next, candidate);
    if (duplicateIndex >= 0) {
      next = next.map((entry, index) =>
        index === duplicateIndex ? mergeConnectionFacts(entry, person) : entry
      );
    } else {
      next = [candidate, ...next];
    }
  }

  return next;
}

export function applyNamedConnectionsToProfile(input: {
  contactName: string;
  profile: ContactProfile;
  notesLog?: ContactNoteEntry[];
  extraText?: string;
}): { profile: ContactProfile; changed: boolean } {
  const notesText = [
    input.extraText,
    ...filterUserAuthoredNotes(input.notesLog ?? []).map(
      (entry) => entry.content
    ),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  const extracted = [
    ...connectionsFromProfileFields(input.profile, input.contactName),
    ...extractNamedConnectionsFromText(notesText, {
      contactName: input.contactName,
    }),
  ];

  if (extracted.length === 0) {
    return { profile: input.profile, changed: false };
  }

  const current = parseRelationshipTree(
    input.profile[KINSIGHT_RELATIONSHIP_TREE_KEY]
  );
  const nextTree = mergeExtractedIntoTree(
    current,
    extracted,
    input.contactName
  );
  const serialized = serializeRelationshipTree(nextTree);
  const previous = serializeRelationshipTree(current);

  if (serialized === previous) {
    return { profile: input.profile, changed: false };
  }

  return {
    profile: {
      ...input.profile,
      [KINSIGHT_RELATIONSHIP_TREE_KEY]: serialized,
    },
    changed: true,
  };
}
