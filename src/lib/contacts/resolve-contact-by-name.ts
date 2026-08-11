import type { Contact } from "@/types/contact";

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveContactByName(
  contactName: string,
  contacts: Contact[]
): {
  contact: Contact | null;
  matches: Contact[];
} {
  const query = normalizeName(contactName);
  if (!query) {
    return { contact: null, matches: [] };
  }

  const exact = contacts.filter(
    (contact) => normalizeName(contact.name) === query
  );
  if (exact.length === 1) {
    return { contact: exact[0], matches: exact };
  }

  const queryParts = query.split(" ").filter(Boolean);

  const scored = contacts
    .map((contact) => {
      const normalized = normalizeName(contact.name);
      const nameParts = normalized.split(" ").filter(Boolean);
      const matchedParts = queryParts.filter((part) =>
        nameParts.some((namePart) => namePart.includes(part) || part.includes(namePart))
      );
      const score = matchedParts.length;
      const containsFullQuery = normalized.includes(query) || query.includes(normalized);

      return {
        contact,
        score: containsFullQuery ? Math.max(score, queryParts.length) : score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { contact: null, matches: [] };
  }

  const topScore = scored[0].score;
  const topMatches = scored
    .filter((item) => item.score === topScore)
    .map((item) => item.contact);

  if (topMatches.length === 1) {
    return { contact: topMatches[0], matches: topMatches };
  }

  return { contact: null, matches: topMatches };
}
