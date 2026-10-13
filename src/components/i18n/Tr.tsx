"use client";
import { useTr } from "@/lib/i18n/LocaleProvider";

/** <Tr>English text</Tr> renders the Telugu version when the site language is Telugu. */
export function Tr({ children }: { children: string }) {
  return <>{useTr()(children)}</>;
}
