/**
 * Short affirmations/negations used to confirm agent identity checks.
 * These must not be treated as relationship notes that invent a contact
 * named "yes" / "ok" / etc.
 */
const CONFIRMATION_ONLY_RE =
  /^(yes|yep|yeah|yea|yup|ya|sure|ok|okay|correct|confirmed|confirm|right|absolutely|affirmative|please|go ahead|sounds good|that'?s (right|correct)|yes please|yes that'?s (right|correct)|no|nope|nah|cancel|never ?mind|don'?t|do not)([.!?]*)?$/i;

export function isConfirmationOnlyUtterance(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
    .replace(/\s+/g, " ");

  if (!normalized) return false;
  return CONFIRMATION_ONLY_RE.test(normalized);
}

/** True when a parsed display name is itself just a confirmation word. */
export function isConfirmationOnlyName(name: string): boolean {
  return isConfirmationOnlyUtterance(name);
}
