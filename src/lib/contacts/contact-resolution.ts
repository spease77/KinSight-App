import { uniqueAliases } from "@/lib/contacts/contact-aliases";
import { parseContactNameParts } from "@/lib/contacts/parse-contact-name";

export const CONTACT_MATCH_THRESHOLD = 0.85;

export type ContactResolutionRecord = {
  id: string;
  name: string;
  company: string;
  role: string;
  emails: string[];
  aliases: string[];
};

export type ResolveContactQuery = {
  name?: string;
  email?: string;
  contextCompany?: string;
  eventTitle?: string;
};

export type ContactMatchBasis = "email" | "name" | "alias" | "fuzzy" | "llm";

export type ScoredContactMatch = {
  contactId: string;
  name: string;
  company: string;
  role: string;
  matchedOn: ContactMatchBasis;
  confidence: number;
};

const NICKNAMES: Record<string, string[]> = {
  alexander: ["alex", "al"],
  alexandra: ["alex", "lexi", "sandra"],
  andrew: ["andy", "drew"],
  benjamin: ["ben", "benny"],
  charles: ["charlie", "chuck", "chas"],
  charlie: ["charles", "chuck"],
  chuck: ["charles", "charlie"],
  christopher: ["chris"],
  christine: ["chris", "chrissy"],
  daniel: ["dan", "danny"],
  david: ["dave", "davy"],
  deborah: ["deb", "debbie"],
  elizabeth: ["liz", "lizzy", "beth", "eliza", "lisa"],
  james: ["jim", "jimmy", "jamie"],
  jennifer: ["jen", "jenny"],
  john: ["jon", "johnny", "jack"],
  jonathan: ["jon", "jonny"],
  joseph: ["joe", "joey"],
  katherine: ["kate", "katie", "kathy", "cathy"],
  kathleen: ["kathy", "kate", "katie"],
  matthew: ["matt"],
  michael: ["mike", "mikey"],
  nicholas: ["nick", "nicky"],
  patricia: ["pat", "patty", "tricia", "trish"],
  patrick: ["pat", "paddy"],
  richard: ["rick", "rich", "dick", "ricky"],
  robert: ["rob", "bob", "bobby", "robbie"],
  samuel: ["sam", "sammy"],
  samantha: ["sam", "sammy"],
  stephen: ["steve", "stevie"],
  steven: ["steve", "stevie"],
  susan: ["sue", "suzy", "susie"],
  thomas: ["tom", "tommy"],
  william: ["will", "bill", "billy", "liam", "willy"],
};

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s@.+-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols).fill(0);

  for (let i = 0; i < rows; i += 1) matrix[i * cols] = i;
  for (let j = 0; j < cols; j += 1) matrix[j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = matrix[(i - 1) * cols + j] + 1;
      const ins = matrix[i * cols + j - 1] + 1;
      const sub = matrix[(i - 1) * cols + j - 1] + cost;
      matrix[i * cols + j] = Math.min(del, ins, sub);
    }
  }

  return matrix[(rows - 1) * cols + (cols - 1)];
}

export function stringSimilarity(a: string, b: string): number {
  const left = normalizeToken(a);
  const right = normalizeToken(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(left, right) / maxLen;
}

function nicknameSet(firstName: string): Set<string> {
  const key = normalizeToken(firstName);
  const set = new Set<string>([key]);
  const mapped = NICKNAMES[key];
  if (mapped) {
    for (const alias of mapped) set.add(normalizeToken(alias));
  }
  for (const [canonical, aliases] of Object.entries(NICKNAMES)) {
    if (aliases.some((alias) => normalizeToken(alias) === key)) {
      set.add(canonical);
      for (const alias of aliases) set.add(normalizeToken(alias));
    }
  }
  return set;
}

function companyOverlap(query: string | undefined, company: string): number {
  const left = normalizeToken(query ?? "");
  const right = normalizeToken(company);
  if (!left || !right) return 0;
  if (left === right) return 0.12;
  if (left.includes(right) || right.includes(left)) return 0.1;
  const leftParts = left.split(" ").filter((part) => part.length > 2);
  const hit = leftParts.some((part) => right.includes(part));
  return hit ? 0.08 : 0;
}

function titleBoost(eventTitle: string | undefined, contactName: string): number {
  const title = normalizeToken(eventTitle ?? "");
  if (!title) return 0;
  const { firstName, lastName } = parseContactNameParts(contactName);
  const last = normalizeToken(lastName);
  const first = normalizeToken(firstName);
  if (last && last.length >= 3 && title.includes(last)) return 0.08;
  if (first && first.length >= 3 && title.includes(first)) return 0.04;
  return 0;
}

function scoreName(queryName: string, record: ContactResolutionRecord): {
  score: number;
  matchedOn: ContactMatchBasis;
} {
  const query = normalizeToken(queryName);
  const full = normalizeToken(record.name);
  if (!query) return { score: 0, matchedOn: "fuzzy" };
  if (query === full) return { score: 0.97, matchedOn: "name" };

  const aliases = record.aliases.map((alias) => normalizeToken(alias));
  if (aliases.includes(query)) return { score: 0.95, matchedOn: "alias" };

  const queryParts = parseContactNameParts(queryName);
  const recordParts = parseContactNameParts(record.name);
  const qFirst = normalizeToken(queryParts.firstName);
  const qLast = normalizeToken(queryParts.lastName);
  const rFirst = normalizeToken(recordParts.firstName);
  const rLast = normalizeToken(recordParts.lastName);
  const queryNick = nicknameSet(qFirst);
  const recordNick = nicknameSet(rFirst);
  const firstNickMatch =
    Boolean(qFirst) &&
    Boolean(rFirst) &&
    (queryNick.has(rFirst) || recordNick.has(qFirst));

  if (qFirst && rFirst && qLast && rLast) {
    if (qFirst === rFirst && qLast === rLast) {
      return { score: 0.96, matchedOn: "name" };
    }
    if (firstNickMatch && qLast === rLast) {
      return { score: 0.93, matchedOn: "alias" };
    }
  }

  if (qLast && rLast && qLast === rLast && firstNickMatch) {
    return { score: 0.92, matchedOn: "alias" };
  }

  if (qFirst && !qLast) {
    const firstExact =
      qFirst === rFirst || aliases.includes(qFirst) || firstNickMatch;
    if (firstExact) {
      return { score: 0.78, matchedOn: "alias" };
    }
  }

  let bestFuzzy = stringSimilarity(query, record.name);
  for (const alias of record.aliases) {
    bestFuzzy = Math.max(bestFuzzy, stringSimilarity(query, alias));
  }
  if (qFirst && rFirst) {
    bestFuzzy = Math.max(bestFuzzy, stringSimilarity(qFirst, rFirst) * 0.85);
  }
  if (qLast && rLast) {
    bestFuzzy = Math.max(bestFuzzy, stringSimilarity(qLast, rLast) * 0.9);
  }

  if (bestFuzzy >= 0.78) {
    return { score: Math.min(0.92, bestFuzzy), matchedOn: "fuzzy" };
  }

  return { score: 0, matchedOn: "fuzzy" };
}

export function scoreContactMatch(
  query: ResolveContactQuery,
  record: ContactResolutionRecord
): ScoredContactMatch | null {
  const email = normalizeEmail(query.email ?? "");
  if (email && record.emails.some((item) => normalizeEmail(item) === email)) {
    return {
      contactId: record.id,
      name: record.name,
      company: record.company,
      role: record.role,
      matchedOn: "email",
      confidence: 1,
    };
  }

  const named = query.name?.trim()
    ? scoreName(query.name, record)
    : { score: 0, matchedOn: "fuzzy" as const };

  let score = named.score;
  if (score <= 0) return null;

  score += companyOverlap(query.contextCompany, record.company);
  score += titleBoost(query.eventTitle, record.name);
  score = Math.min(1, score);

  return {
    contactId: record.id,
    name: record.name,
    company: record.company,
    role: record.role,
    matchedOn: named.matchedOn,
    confidence: Number(score.toFixed(3)),
  };
}

export function rankContactMatches(
  query: ResolveContactQuery,
  records: ContactResolutionRecord[]
): ScoredContactMatch[] {
  return records
    .map((record) => scoreContactMatch(query, record))
    .filter((item): item is ScoredContactMatch => item !== null)
    .sort((a, b) => b.confidence - a.confidence);
}

export function pickResolvedMatch(
  ranked: ScoredContactMatch[],
  threshold = CONTACT_MATCH_THRESHOLD
): {
  match: ScoredContactMatch | null;
  needsConfirmation: boolean;
  candidates: ScoredContactMatch[];
} {
  const candidates = ranked.filter((item) => item.confidence >= 0.5).slice(0, 6);
  const top = ranked[0];
  if (!top) {
    return { match: null, needsConfirmation: false, candidates: [] };
  }

  if (top.matchedOn === "email" && top.confidence >= 1) {
    const emailTies = ranked.filter(
      (item) => item.matchedOn === "email" && item.confidence >= 1
    );
    if (emailTies.length === 1) {
      return { match: top, needsConfirmation: false, candidates: emailTies };
    }
    return { match: null, needsConfirmation: true, candidates: emailTies };
  }

  const second = ranked[1];
  const gap = second ? top.confidence - second.confidence : 1;
  const uniqueEnough = gap >= 0.08;

  if (top.confidence >= threshold && uniqueEnough) {
    return { match: top, needsConfirmation: false, candidates };
  }

  if (candidates.length === 0) {
    return { match: null, needsConfirmation: false, candidates: [] };
  }

  return { match: null, needsConfirmation: true, candidates };
}

export function emailsFromProfileFields(profile: Record<string, string> | undefined): string[] {
  if (!profile) return [];
  return uniqueAliases([
    profile.businessEmail,
    profile.personalEmail,
    profile.otherEmail,
  ]).filter((value) => value.includes("@"));
}
