import type { PhoneContactImport } from "@/lib/contacts/phone-contacts";

function unfoldVCard(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function decodeQuotedPrintable(value: string): string {
  return value
    .replace(/=\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
}

function unescapeVCard(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function decodeVCardValue(raw: string, params: string): string {
  const upper = params.toUpperCase();
  let value = raw;
  if (upper.includes("QUOTED-PRINTABLE")) {
    value = decodeQuotedPrintable(value);
  }
  return unescapeVCard(value);
}

function nameFromN(value: string): string {
  const [family, given, additional, prefix, suffix] = value.split(";");
  return [prefix, given, additional, family, suffix]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function parseOneVCard(block: string): PhoneContactImport | null {
  const lines = unfoldVCard(block);
  let fn = "";
  let fromN = "";
  let company = "";
  let role = "";
  let email = "";
  let phone = "";
  let cellPhone = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("BEGIN:") || trimmed.startsWith("END:")) {
      continue;
    }
    const splitAt = trimmed.indexOf(":");
    if (splitAt <= 0) continue;
    const keyPart = trimmed.slice(0, splitAt);
    const rawValue = trimmed.slice(splitAt + 1);
    const [rawName, ...paramParts] = keyPart.split(";");
    const name = rawName.replace(/^item\d+\./i, "").toUpperCase();
    const params = paramParts.join(";");
    const value = decodeVCardValue(rawValue, params);
    if (!value) continue;

    if (name === "FN") fn = value;
    else if (name === "N" && !fromN) fromN = nameFromN(value);
    else if (name === "ORG" && !company) company = value.split(";")[0]?.trim() ?? "";
    else if (name === "TITLE" && !role) role = value;
    else if (name === "EMAIL" && !email) email = value;
    else if (name === "TEL") {
      const isCell = /CELL|MOBILE/i.test(params);
      if (isCell && !cellPhone) cellPhone = value;
      else if (!phone) phone = value;
    }
  }

  const name = fn || fromN;
  if (!name) return null;
  return {
    name,
    company: company || undefined,
    role: role || undefined,
    phone: (cellPhone || phone) || undefined,
    email: email || undefined,
  };
}

export function parseVCardText(text: string): PhoneContactImport[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  const contacts: PhoneContactImport[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const parsed = parseOneVCard(card);
    if (!parsed) continue;
    const key = [
      parsed.name.toLowerCase(),
      parsed.email?.toLowerCase() ?? "",
      parsed.phone?.replace(/\D/g, "") ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push(parsed);
  }

  return contacts;
}

function detectCsvDelimiter(header: string): string {
  const tabs = (header.match(/\t/g) ?? []).length;
  const semis = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  if (tabs > 0 && tabs >= semis && tabs >= commas) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseCsvContacts(text: string): PhoneContactImport[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());
  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((cell) =>
    cell.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  );

  const nameIdx = headerIndex(headers, ["name", "full name", "contact", "display name"]);
  const firstIdx = headerIndex(headers, ["first name", "firstname", "given name"]);
  const lastIdx = headerIndex(headers, ["last name", "lastname", "surname", "family name"]);
  const emailIdx = headerIndex(headers, ["email", "e mail", "email address"]);
  const phoneIdx = headerIndex(headers, [
    "phone",
    "mobile",
    "cell",
    "telephone",
    "phone number",
    "mobile phone",
  ]);
  const companyIdx = headerIndex(headers, ["company", "organization", "org", "account"]);
  const roleIdx = headerIndex(headers, ["title", "role", "job title", "position"]);

  const contacts: PhoneContactImport[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line, delimiter);
    const composed = [cells[firstIdx], cells[lastIdx]]
      .filter((part) => part?.trim())
      .join(" ");
    const name = (nameIdx >= 0 ? cells[nameIdx] : "") || composed;
    if (!name.trim()) continue;
    contacts.push({
      name: name.trim(),
      email: emailIdx >= 0 ? cells[emailIdx] || undefined : undefined,
      phone: phoneIdx >= 0 ? cells[phoneIdx] || undefined : undefined,
      company: companyIdx >= 0 ? cells[companyIdx] || undefined : undefined,
      role: roleIdx >= 0 ? cells[roleIdx] || undefined : undefined,
    });
  }
  return contacts;
}

export function parseContactImportText(text: string): PhoneContactImport[] {
  if (/BEGIN:VCARD/i.test(text)) return parseVCardText(text);
  return parseCsvContacts(text);
}

export async function parseContactImportFiles(
  files: File[]
): Promise<PhoneContactImport[]> {
  const contacts: PhoneContactImport[] = [];
  for (const file of files) {
    const text = await file.text();
    contacts.push(...parseContactImportText(text));
  }
  return contacts;
}

export const CONTACT_IMPORT_ACCEPT =
  ".vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv";
