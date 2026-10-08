/**
 * Detects personal data that must never appear in publicly displayed text
 * (Lost & Found public summaries). This is a *guard for moderators*, not a
 * substitute for them: it catches the obvious leaks (phone numbers, emails,
 * ID-number-length digit runs, links) so a rushed approval can't publish them.
 */
export interface SensitiveFinding {
  kind: "phone_or_id_number" | "email" | "link";
  label: string;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const LINK = /(?:https?:\/\/|www\.)\S+/i;
// A run of 8+ digits allowing single spaces / dashes / dots between digits: phone numbers, Aadhaar (12), passport/licence numbers, card numbers.
const LONG_DIGITS = /(?:\d[\s.-]?){8,}/;

export function findSensitive(text: string): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  if (EMAIL.test(text)) findings.push({ kind: "email", label: "an email address" });
  if (LINK.test(text)) findings.push({ kind: "link", label: "a web link" });
  if (LONG_DIGITS.test(text)) findings.push({ kind: "phone_or_id_number", label: "a phone number or ID number" });
  return findings;
}

/** Human-readable error for form/API validation, or null when the text is safe to publish. */
export function sensitiveTextError(fieldLabel: string, text: string): string | null {
  const found = findSensitive(text);
  if (found.length === 0) return null;
  return `${fieldLabel} appears to contain ${found.map((f) => f.label).join(" and ")}. Remove it — public text must not include personal contact or ID details.`;
}
