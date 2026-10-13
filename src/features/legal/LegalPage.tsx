import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { LEGAL_UPDATED, CONTACT_EMAIL, type LegalSection } from "./content";

export function LegalPage({ title, intro, sections }: { title: string; intro?: string; sections: LegalSection[] }) {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: {LEGAL_UPDATED}</p>
        {intro && <p className="mt-4 text-ink">{intro}</p>}
        {sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-ink">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 leading-relaxed text-ink-muted">{p}</p>
            ))}
          </section>
        ))}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <p className="mt-2 text-ink-muted">
            {CONTACT_EMAIL ? <>Email <a className="text-river-deep underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the </> : "Use the "}
            <Link className="text-river-deep underline" href="/contact">Contact page</Link>.
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
