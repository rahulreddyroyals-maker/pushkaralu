import type { VerifiedItem } from "./types";

const MARKER = /\[\[([a-z]+:[^\]\s]+)\]\]/g;

export type Segment = { type: "text"; value: string } | { type: "ref"; item: VerifiedItem };

/** Removes citation markers so claim checks never see ids (random ids contain digits). */
export function stripCitations(text: string): string {
  return text.replace(MARKER, "").replace(/[ \t]{2,}/g, " ");
}

/**
 * Splits model text into text and verified-item references. A marker that
 * doesn't match an item the tools actually returned this turn is dropped —
 * the model can't make something look verified by inventing a ref.
 */
export function splitCitations(text: string, items: VerifiedItem[]): Segment[] {
  const byRef = new Map(items.map((i) => [i.ref, i]));
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", value: text.slice(last, idx) });
    const hit = byRef.get(m[1]);
    if (hit) out.push({ type: "ref", item: hit });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
