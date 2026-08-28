import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, type Dictionary } from "./types";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  te: () => import("./dictionaries/te").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const safeLocale = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
  return loaders[safeLocale]();
}

/** Simple {{placeholder}} interpolation — swap for a full i18n lib later if needed. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

export * from "./types";
