/**
 * Phone helpers for one-tap calling. Emergency numbers can be as short as
 * 3 digits (national short codes) so the validator is intentionally looser
 * than the 6-digit minimum used for provider numbers.
 */
export const PHONE_PATTERN = /^\+?\d[\d\s-]{1,18}\d$/;

export function isPlausiblePhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

/** Builds a `tel:` href from a human-entered number: keeps digits and a leading "+", drops spaces/dashes. Returns null if nothing dialable remains. */
export function telHref(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
