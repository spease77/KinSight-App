export type PhoneCountry = {
  iso2: string;
  name: string;
  dialCode: string;
};

export function sanitizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export type ParsedPhoneValue = {
  country: PhoneCountry;
  nationalDigits: string;
  e164: string;
};

export const US_PHONE_COUNTRY: PhoneCountry = {
  iso2: "US",
  name: "United States",
  dialCode: "1",
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  US_PHONE_COUNTRY,
  { iso2: "CA", name: "Canada", dialCode: "1" },
  { iso2: "GB", name: "United Kingdom", dialCode: "44" },
  { iso2: "AU", name: "Australia", dialCode: "61" },
  { iso2: "DE", name: "Germany", dialCode: "49" },
  { iso2: "FR", name: "France", dialCode: "33" },
  { iso2: "IN", name: "India", dialCode: "91" },
  { iso2: "MX", name: "Mexico", dialCode: "52" },
  { iso2: "BR", name: "Brazil", dialCode: "55" },
  { iso2: "JP", name: "Japan", dialCode: "81" },
  { iso2: "CN", name: "China", dialCode: "86" },
  { iso2: "KR", name: "South Korea", dialCode: "82" },
  { iso2: "IT", name: "Italy", dialCode: "39" },
  { iso2: "ES", name: "Spain", dialCode: "34" },
  { iso2: "NL", name: "Netherlands", dialCode: "31" },
  { iso2: "SE", name: "Sweden", dialCode: "46" },
  { iso2: "CH", name: "Switzerland", dialCode: "41" },
  { iso2: "IE", name: "Ireland", dialCode: "353" },
  { iso2: "NZ", name: "New Zealand", dialCode: "64" },
  { iso2: "SG", name: "Singapore", dialCode: "65" },
  { iso2: "IL", name: "Israel", dialCode: "972" },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "971" },
];

const PHONE_COUNTRIES_BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

const NANP_COUNTRIES = new Set(["US", "CA"]);

export function countryFlagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

export function getPhoneCountryByIso(iso2: string): PhoneCountry {
  return (
    PHONE_COUNTRIES.find(
      (country) => country.iso2.toUpperCase() === iso2.toUpperCase()
    ) ?? US_PHONE_COUNTRY
  );
}

export function detectDefaultPhoneCountry(): PhoneCountry {
  if (typeof navigator === "undefined") {
    return US_PHONE_COUNTRY;
  }

  const locale = navigator.language || "en-US";
  const region = locale.split("-")[1]?.toUpperCase();
  if (!region) return US_PHONE_COUNTRY;

  return getPhoneCountryByIso(region);
}

function findCountryByDialDigits(digits: string): PhoneCountry | null {
  for (const country of PHONE_COUNTRIES_BY_DIAL_LENGTH) {
    if (digits.startsWith(country.dialCode)) {
      return country;
    }
  }
  return null;
}

export function maxNationalDigitsForCountry(country: PhoneCountry): number {
  if (NANP_COUNTRIES.has(country.iso2)) return 10;
  return 14;
}

export function formatNanpNational(digits: string): string {
  const d = digits.slice(0, 10);
  const len = d.length;

  if (len === 0) return "";
  if (len < 3) return `(${d}`;
  if (len === 3) return `(${d})`;
  if (len <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function formatGenericNational(digits: string): string {
  const d = digits.slice(0, 14);
  if (!d) return "";

  const groups: string[] = [];
  let index = 0;

  while (index < d.length) {
    const remaining = d.length - index;
    const size = remaining > 4 ? 3 : remaining;
    groups.push(d.slice(index, index + size));
    index += size;
  }

  return groups.join(" ");
}

export function formatNationalPhoneDisplay(
  country: PhoneCountry,
  nationalDigits: string
): string {
  if (!nationalDigits) return "";
  if (NANP_COUNTRIES.has(country.iso2)) {
    return formatNanpNational(nationalDigits);
  }
  return formatGenericNational(nationalDigits);
}

export function formatCountryPillLabel(country: PhoneCountry): string {
  return `${country.iso2} +${country.dialCode}`;
}

export function buildPhoneE164(
  country: PhoneCountry,
  nationalDigits: string
): string {
  const digits = sanitizePhoneDigits(nationalDigits);
  if (!digits) return "";
  return `+${country.dialCode}${digits}`;
}

export function parseStoredPhone(
  stored: string,
  fallbackCountry: PhoneCountry = US_PHONE_COUNTRY
): ParsedPhoneValue {
  const trimmed = stored?.trim() ?? "";
  if (!trimmed) {
    return { country: fallbackCountry, nationalDigits: "", e164: "" };
  }

  if (trimmed.startsWith("+")) {
    const allDigits = sanitizePhoneDigits(trimmed);
    const matched = findCountryByDialDigits(allDigits);
    if (matched) {
      const nationalDigits = allDigits.slice(matched.dialCode.length);
      return {
        country: matched,
        nationalDigits,
        e164: `+${allDigits}`,
      };
    }

    return {
      country: fallbackCountry,
      nationalDigits: allDigits,
      e164: `+${allDigits}`,
    };
  }

  const nationalDigits = sanitizePhoneDigits(trimmed);
  const country = fallbackCountry;
  return {
    country,
    nationalDigits,
    e164: buildPhoneE164(country, nationalDigits),
  };
}

export function formatStoredPhoneDisplay(stored: string): string {
  const parsed = parseStoredPhone(stored);
  if (!parsed.nationalDigits) return stored.trim();

  const national = formatNationalPhoneDisplay(
    parsed.country,
    parsed.nationalDigits
  );
  return `+${parsed.country.dialCode} ${national}`.trim();
}

export function extractNationalDigitsFromInput(
  country: PhoneCountry,
  inputValue: string
): string {
  const digits = sanitizePhoneDigits(inputValue);
  return digits.slice(0, maxNationalDigitsForCountry(country));
}

export function isPhoneInputNavigationKey(key: string): boolean {
  return [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "Enter",
    "Escape",
  ].includes(key);
}

export function isPhoneInputModifierEvent(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}
