import {
  filterUserAuthoredNotes,
  type ContactNoteEntry,
} from "@/lib/contacts/notes-log";
import { applyNamedConnectionsToProfile } from "@/lib/contacts/extract-named-connections";
import {
  KINSIGHT_CONTACT_FACTS_KEY,
  upsertContactFacts,
} from "@/lib/contacts/contact-facts";
import {
  KINSIGHT_LABELED_INTERESTS_KEY,
  readLabeledInterests,
  upsertLabeledInterest,
  writeLabeledInterests,
} from "@/lib/contacts/labeled-contact-fields";
import {
  findDuplicateConnectionIndex,
  mergeConnectionFacts,
  personToRelationshipEntry,
} from "@/lib/contacts/proposed-connection";
import {
  getEntryDisplayName,
  getRelationshipEntryFacts,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
  serializeRelationshipTree,
  withRelationshipEntryFacts,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";
import type { ContactProfile } from "@/types/contact-profile";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";

export type AmbiguousIntelItem = {
  contactId?: string;
  contactName?: string;
  text: string;
  reason: string;
  candidates: Array<{ kind: "contact" | "connection" | "unnamed"; name: string }>;
};

export type ExtractedContactIntel = {
  interests: Array<{ label: string; value: string }>;
  contactFacts: string[];
  connectionFacts: Array<{ firstName: string; lastName: string; facts: string[] }>;
  ambiguous: AmbiguousIntelItem[];
};

type NoteSection = {
  title: string;
  bullets: string[];
};

const INTEREST_TITLE =
  /\b(hobb|interest|passion|recreation|sport|politic|gun|hunt|fish|golf|food|drink|wine|beer|travel|vacation|car|music|cook|ski|boat|shoot)\b/i;
const FAMILY_TITLE =
  /\b(family|families|connection|relative|spouse|children|kids|household)\b/i;
const GUN_RELATED = /\b(gun|firearm|pistol|rifle|shotgun|caliber|2a|second amendment|licens|clip capacity)\b/i;
const SKIP_TITLE = /^(profile updated|connection\s+[—–-]|contact type)/i;
const MARRIED_TO = /^married(?:\s+to)?\s+/i;
const UNNAMED_SUBJECT =
  /^(son|daughter|child|kids|wife|husband|spouse|partner)\s+(owns|has|likes|loves|works|is|collects|drives)\b/i;

function stripBullet(line: string): string {
  return line.trim().replace(/^[-•*]\s+/, "").trim();
}

function isBullet(line: string): boolean {
  return /^[-•*]\s+/.test(line.trim());
}

function splitNoteSections(text: string): NoteSection[] {
  const sections: NoteSection[] = [];
  let current: NoteSection | null = null;

  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (isBullet(line)) {
      if (!current) {
        current = { title: "", bullets: [] };
        sections.push(current);
      }
      const bullet = stripBullet(line);
      if (bullet) current.bullets.push(bullet);
      continue;
    }

    current = { title: line, bullets: [] };
    sections.push(current);
  }

  return sections;
}

function topicFromTitle(title: string): string {
  const dashed = title.split(/\s+[—–-]\s+/);
  if (dashed.length > 1) {
    return dashed[dashed.length - 1].trim();
  }
  return title
    .replace(/^(hobbies and interests|hobbies|interests|political views|politics)\s*/i, "")
    .trim() || title.trim();
}

function interestLabelFromTitle(title: string): string {
  const topic = topicFromTitle(title);
  if (/politic/i.test(title) || /politic/i.test(topic)) return "Politics";
  if (/gun|firearm|shoot/i.test(title) || /gun|firearm|shoot/i.test(topic)) {
    return "Guns";
  }
  if (/sport/i.test(title)) return "Sports";
  if (/food|drink|wine|beer/i.test(title)) return "Food/Drink";
  if (/licens|permit/i.test(title) && GUN_RELATED.test(title)) return "Guns";
  if (topic && topic.length <= 40) return topic;
  if (/hobb|interest|passion/i.test(title)) return "Hobby";
  return topic || "Interest";
}

function joinDetails(parts: string[]): string {
  return parts
    .map((part) => part.trim().replace(/[.;]+$/, ""))
    .filter(Boolean)
    .join("; ");
}

function findNamedConnection(
  text: string,
  connections: RelationshipTreeEntry[]
): RelationshipTreeEntry | null {
  const lower = text.toLowerCase();
  for (const entry of connections) {
    const first = entry.firstName.trim().toLowerCase();
    if (first.length < 2) continue;
    const full = getEntryDisplayName(entry).toLowerCase();
    if (full && lower.includes(full)) return entry;
    const firstRe = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (firstRe.test(text)) return entry;
  }
  return null;
}

export function extractContactIntelFromText(
  text: string,
  options?: {
    contactName?: string;
    connections?: RelationshipTreeEntry[];
  }
): ExtractedContactIntel {
  const source = text.trim();
  const interests: Array<{ label: string; value: string }> = [];
  const contactFacts: string[] = [];
  const connectionFacts: ExtractedContactIntel["connectionFacts"] = [];
  const ambiguous: AmbiguousIntelItem[] = [];
  const contactName = options?.contactName?.trim() || "this contact";
  const connections = options?.connections ?? [];

  if (!source) {
    return { interests, contactFacts, connectionFacts, ambiguous };
  }

  const pushInterest = (label: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const existing = interests.find(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );
    if (existing) {
      const key = trimmed.toLowerCase();
      if (!existing.value.toLowerCase().includes(key)) {
        existing.value = `${existing.value}; ${trimmed}`;
      }
      return;
    }
    interests.push({ label, value: trimmed });
  };

  const pushConnectionFact = (
    entry: RelationshipTreeEntry,
    fact: string
  ) => {
    const trimmed = fact.trim();
    if (!trimmed) return;
    const existing = connectionFacts.find(
      (item) =>
        item.firstName.toLowerCase() === entry.firstName.trim().toLowerCase() &&
        (!item.lastName ||
          !entry.lastName.trim() ||
          item.lastName.toLowerCase() === entry.lastName.trim().toLowerCase())
    );
    if (existing) {
      if (!existing.facts.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        existing.facts.push(trimmed);
      }
      return;
    }
    connectionFacts.push({
      firstName: entry.firstName.trim(),
      lastName: entry.lastName.trim(),
      facts: [trimmed],
    });
  };

  const classifyLine = (line: string, sectionKind: "interest" | "family" | "fact") => {
    const named = findNamedConnection(line, connections);
    if (named && !MARRIED_TO.test(line)) {
      pushConnectionFact(named, line);
      return;
    }

    if (UNNAMED_SUBJECT.test(line)) {
      const role = line.match(UNNAMED_SUBJECT)?.[1] ?? "connection";
      ambiguous.push({
        text: line,
        reason: `This sounds like it belongs to ${contactName}'s ${role}, who is not named yet.`,
        candidates: [
          { kind: "contact", name: contactName },
          { kind: "unnamed", name: `their ${role}` },
        ],
      });
      return;
    }

    if (sectionKind === "family") {
      if (MARRIED_TO.test(line)) return;
      contactFacts.push(line);
      return;
    }

    if (sectionKind === "interest") {
      return;
    }

    contactFacts.push(line);
  };

  for (const section of splitNoteSections(source)) {
    const title = section.title.trim();
    if (title && SKIP_TITLE.test(title)) continue;

    const family = FAMILY_TITLE.test(title);
    const interest = !family && (INTEREST_TITLE.test(title) || GUN_RELATED.test(title));
    const kind: "interest" | "family" | "fact" = family
      ? "family"
      : interest
        ? "interest"
        : "fact";

    if (kind === "interest") {
      const label = interestLabelFromTitle(title);
      const details = section.bullets.length > 0 ? joinDetails(section.bullets) : "";
      const value = details || topicFromTitle(title);
      pushInterest(label, value);
      continue;
    }

    const lines =
      section.bullets.length > 0
        ? section.bullets
        : title
          ? [title]
          : [];
    for (const line of lines) {
      classifyLine(line, kind);
    }
  }

  return { interests, contactFacts, connectionFacts, ambiguous };
}

function intelSignature(profile: ContactProfile): string {
  return JSON.stringify({
    interests: profile[KINSIGHT_LABELED_INTERESTS_KEY] ?? "",
    facts: profile[KINSIGHT_CONTACT_FACTS_KEY] ?? "",
    tree: profile[KINSIGHT_RELATIONSHIP_TREE_KEY] ?? "",
    hobbies: profile.hobbiesRecreation ?? "",
    sports: profile.spectatorSports ?? "",
  });
}

function notesCorpus(input: {
  notesLog?: ContactNoteEntry[];
  extraText?: string;
}): string {
  return [
    input.extraText,
    ...filterUserAuthoredNotes(input.notesLog ?? []).map((entry) => entry.content),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n\n");
}

function applyConnectionFacts(
  profile: ContactProfile,
  contactName: string,
  facts: ExtractedContactIntel["connectionFacts"]
): ContactProfile {
  if (facts.length === 0) return profile;

  let tree = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
  let changed = false;

  for (const item of facts) {
    const person: ParsedProposedPerson = {
      displayName: [item.firstName, item.lastName].filter(Boolean).join(" "),
      firstName: item.firstName,
      lastName: item.lastName || undefined,
      notes: item.facts.join("\n"),
      recordAs: "connection",
      connectionAnchorName: contactName,
      profile: {
        firstName: item.firstName,
        ...(item.lastName ? { lastName: item.lastName } : {}),
      },
      sourceSnippets: {},
    };
    const candidate = personToRelationshipEntry(person);
    const index = findDuplicateConnectionIndex(tree, candidate);
    if (index < 0) {
      tree = [candidate, ...tree];
      changed = true;
      continue;
    }

    const merged = mergeConnectionFacts(tree[index], person);
    const before = getRelationshipEntryFacts(tree[index]).join("|");
    const after = getRelationshipEntryFacts(merged).join("|");
    if (before !== after) {
      tree = tree.map((entry, entryIndex) =>
        entryIndex === index ? withRelationshipEntryFacts(merged, getRelationshipEntryFacts(merged)) : entry
      );
      changed = true;
    }
  }

  if (!changed) return profile;
  return {
    ...profile,
    [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree(tree),
  };
}

export function applyContactIntelToProfile(input: {
  contactName: string;
  profile: ContactProfile;
  notesLog?: ContactNoteEntry[];
  extraText?: string;
}): {
  profile: ContactProfile;
  changed: boolean;
  ambiguous: AmbiguousIntelItem[];
} {
  const connections = parseRelationshipTree(
    input.profile[KINSIGHT_RELATIONSHIP_TREE_KEY]
  );
  const extracted = extractContactIntelFromText(
    notesCorpus(input),
    {
      contactName: input.contactName,
      connections,
    }
  );

  let next = input.profile;
  for (const interest of extracted.interests) {
    next = upsertLabeledInterest(next, interest);
  }
  if (extracted.interests.length > 0) {
    const topical = new Set(
      extracted.interests.map((item) => item.label.trim().toLowerCase())
    );
    const pruned = readLabeledInterests(next).filter((entry) => {
      const label = entry.label.trim().toLowerCase();
      if (topical.has(label)) return true;
      return label !== "hobby" && label !== "interest" && label !== "other";
    });
    next = writeLabeledInterests(next, pruned);
  }
  next = upsertContactFacts(next, extracted.contactFacts);
  next = applyConnectionFacts(next, input.contactName, extracted.connectionFacts);

  return {
    profile: next,
    changed: intelSignature(next) !== intelSignature(input.profile),
    ambiguous: extracted.ambiguous,
  };
}

export function applyDerivedContactIntel(input: {
  contactName: string;
  profile: ContactProfile;
  notesLog?: ContactNoteEntry[];
  extraText?: string;
}): {
  profile: ContactProfile;
  changed: boolean;
  ambiguous: AmbiguousIntelItem[];
} {
  const family = applyNamedConnectionsToProfile(input);
  const intel = applyContactIntelToProfile({
    ...input,
    profile: family.profile,
  });
  return {
    profile: intel.profile,
    changed: family.changed || intel.changed,
    ambiguous: intel.ambiguous,
  };
}

export function applyAmbiguousIntelChoice(
  profile: ContactProfile,
  item: AmbiguousIntelItem,
  choice: { kind: "contact-interest" | "contact-fact" | "skip"; label?: string }
): ContactProfile {
  if (choice.kind === "skip") return profile;
  if (choice.kind === "contact-interest") {
    return upsertLabeledInterest(profile, {
      label: choice.label?.trim() || "Interest",
      value: item.text,
    });
  }
  return upsertContactFacts(profile, [item.text]);
}
