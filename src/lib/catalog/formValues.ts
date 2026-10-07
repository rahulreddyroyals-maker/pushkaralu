/**
 * Form-state helpers (client-safe, pure).
 *
 * Cleared number/time/optional-text inputs are stored as `undefined` by the
 * field renderer; `pruneEmpty` removes those keys (recursively, including
 * inside list rows) so optional schema fields validate as "absent" and the
 * JSON body never carries explicit undefined/NaN. Required fields then fail
 * with the schema's own message.
 */
export function pruneEmpty<T>(value: T): T {
  if (Array.isArray(value)) return value.map(pruneEmpty) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = pruneEmpty(v);
    }
    return out as T;
  }
  return value;
}

export interface IssueLike {
  path: PropertyKey[];
  message: string;
}

/** zod issues -> { "days.0.title.en": "message" }. First message per path wins. */
export function formErrors(issues: IssueLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
