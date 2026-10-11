import { stripCitations } from "./citations";
import type { Lang, VerifiedItem } from "./types";

/**
 * Grounding guard — the deterministic backstop behind the prompt rules.
 * The model is told never to state dynamic facts it didn't retrieve; this
 * checks its output anyway and REMOVES any sentence that makes such a claim
 * without support in the verified tool results of this turn:
 *
 *   prices / amounts, crowd levels, room availability, calendar dates,
 *   phone numbers, official announcements.
 *
 * It's intentionally conservative: dropping a borderline sentence is safe,
 * stating an invented fare or crowd level is not.
 */
export type Reason = "price" | "crowd" | "availability" | "date" | "phone" | "announcement";
export interface Removal { sentence: string; reason: Reason }
export interface GuardResult { text: string; removed: Removal[] }

const TELUGU_DIGITS = "౦౧౨౩౪౫౬౭౮౯";
const normalizeDigits = (s: string) => s.replace(/[౦-౯]/g, (d) => String(TELUGU_DIGITS.indexOf(d)));

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthIndex = (name: string) => MONTHS.findIndex((m) => m.startsWith(name.toLowerCase().slice(0, 3)));

/** Extracts "day-month" keys from the many ways a date is written. */
export function dateKeys(raw: string): Set<string> {
  const text = normalizeDigits(raw).toLowerCase();
  const keys = new Set<string>();
  const monthRe = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthRe}\\b`, "g"))) keys.add(`${Number(m[1])}-${monthIndex(m[2]) + 1}`);
  for (const m of text.matchAll(new RegExp(`\\b${monthRe}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "g"))) keys.add(`${Number(m[2])}-${monthIndex(m[1]) + 1}`);
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) keys.add(`${Number(m[3])}-${Number(m[2])}`);
  for (const m of text.matchAll(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/g)) keys.add(`${Number(m[1])}-${Number(m[2])}`);
  return keys;
}

const CURRENCY = /(?:₹|rs\.?|inr|రూ\.?)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:rupees?|రూపాయలు|\/-)/gi;
const PRICE_WORDS = /\b(cost|costs|price|priced|fare|fares|charge|charges|fee|fees|rate|rates|tariff|per night|per person|per day|budget)\b|ధర|ఛార్జీ|ఖర్చు|రుసుము/i;
const CROWD_WORDS = /\b(crowd|crowds|crowded|queue|queues|waiting time|wait time|rush|footfall)\b|రద్దీ|క్యూ/i;
const CROWD_LEVEL = /\b(low|moderate|high|critical|heavy|light|empty|quiet|packed|full|manageable|less|few|minimal|huge|thin)\b|తక్కువ|ఎక్కువ|మధ్యస్థ|ఖాళీ|భారీ/i;
const AVAIL_CLAIM = /\b(rooms?\s+(?:are|is)\s+(?:available|free|vacant|open)|available\s+(?:rooms?|beds?|slots?)|vacanc(?:y|ies)|vacant|sold\s*out|fully\s+booked|slots?\s+(?:are\s+)?available|seats?\s+(?:are\s+)?available|currently\s+available)\b|ఖాళీ గదులు|గదులు అందుబాటులో/i;
const NEGATION = /\b(not|n't|no|cannot|can't|unable|unknown|isn't|aren't|don't|doesn't|without)\b|లేదు|కాదు|తెలియదు/i;
const ANNOUNCE = /\b(announced|officially|official(?:ly)?\s+(?:said|stated|declared|confirmed)|authorities\s+(?:have|has)|government\s+(?:has|have)|notified|notification|has\s+been\s+declared|declared\s+(?:a\s+)?holiday)\b|ప్రకటించ|అధికారికంగా|నోటిఫై/i;
const PHONE = /(?:\+?\d[\d\s\-()]{5,}\d)/g;
const DIAL = /\b(?:dial|call|ring)\b[^.\n]{0,25}?\b(\d{3,5})\b|(?:డయల్|కాల్)[^.\n]{0,25}?(\d{3,5})/gi;

const digitsOf = (s: string) => normalizeDigits(s).replace(/\D/g, "");

export function groundedText(items: VerifiedItem[]): string {
  return items.map((i) => `${i.title} ${i.facts.map((f) => `${f.label} ${f.value}`).join(" ")} ${i.asOf ?? ""}`).join("\n");
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) { out.push(line); continue; }
    const parts = line.split(/(?<=[.!?।])(?<!\b(?:Rs|Re|No|Dr|St|approx|vs))(?<!రూ\.)\s+(?=[^\s\d])/u);
    out.push(...parts);
  }
  return out;
}

export function checkSentence(sentenceRaw: string, items: VerifiedItem[], grounded: string, groundedNumbers: Set<string>, groundedDates: Set<string>, groundedDigits: string): Reason | null {
  const sentence = normalizeDigits(stripCitations(sentenceRaw));
  const cited = /\[\[ghat:/.test(sentenceRaw);

  // prices / amounts
  for (const m of sentence.matchAll(CURRENCY)) {
    const n = (m[1] ?? m[2] ?? "").replace(/,/g, "");
    if (!groundedNumbers.has(n)) return "price";
  }
  if (PRICE_WORDS.test(sentence)) {
    const nums = [...sentence.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)].map((m) => m[0].replace(/,/g, "")).filter((n) => n.length >= 2 && !dateKeysHas(sentence));
    if (nums.some((n) => !groundedNumbers.has(n))) return "price";
  }

  // crowd
  if (CROWD_WORDS.test(sentence) && CROWD_LEVEL.test(sentence) && !NEGATION.test(sentence)) {
    const hasReported = items.some((i) => i.kind === "ghat" && i.facts.some((f) => !/not reported|ఇవ్వలేదు/i.test(f.value) && /crowd|రద్దీ/i.test(f.label)));
    if (!(cited && hasReported)) return "crowd";
  }

  // availability
  if (AVAIL_CLAIM.test(sentence) && !NEGATION.test(sentence)) return "availability";

  // dates
  const keys = dateKeys(sentence);
  for (const k of keys) if (!groundedDates.has(k)) return "date";

  // phone numbers
  for (const m of sentence.matchAll(PHONE)) {
    const d = digitsOf(m[0]);
    if (d.length >= 6 && !groundedDigits.includes(d)) return "phone";
  }
  for (const m of sentence.matchAll(DIAL)) {
    const d = m[1] ?? m[2];
    if (d && !new RegExp(`(?<!\\d)${d}(?!\\d)`).test(grounded)) return "phone";
  }

  // announcements
  if (ANNOUNCE.test(sentence) && !NEGATION.test(sentence)) {
    if (!items.some((i) => i.kind === "announcement" || i.kind === "event")) return "announcement";
  }
  return null;
}

const dateKeysHas = (s: string) => dateKeys(s).size > 0;

export function guardText(text: string, items: VerifiedItem[]): GuardResult {
  const grounded = normalizeDigits(groundedText(items));
  const groundedNumbers = new Set([...grounded.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, "")));
  const groundedDates = dateKeys(grounded);
  const groundedDigits = digitsOf(grounded);
  const kept: string[] = [];
  const removed: Removal[] = [];
  for (const s of splitSentences(text)) {
    if (!s.trim()) { kept.push(s); continue; }
    const reason = checkSentence(s, items, grounded, groundedNumbers, groundedDates, groundedDigits);
    if (reason) removed.push({ sentence: s, reason });
    else kept.push(s);
  }
  const joined = kept.join("\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
  return { text: joined, removed };
}

export const GUARD_NOTICE: Record<Lang, string> = {
  en: "Some statements were removed because they couldn't be matched to verified platform data (prices, crowd, availability, dates, phone numbers or announcements).",
  te: "ధృవీకరించిన ప్లాట్‌ఫాం డేటాతో సరిపోలని కొన్ని వాక్యాలు (ధరలు, రద్దీ, లభ్యత, తేదీలు, ఫోన్ నంబర్లు, ప్రకటనలు) తొలగించబడ్డాయి.",
};
