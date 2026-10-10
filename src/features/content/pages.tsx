import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Card, EmptyState } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoBreadcrumbs } from "@/components/seo/SeoBreadcrumbs";
import { ShareButtons } from "@/components/seo/ShareButtons";
import { Markdown } from "@/components/content/Markdown";
import { getSiteUrl } from "@/lib/seo/site";
import { localizedPath, type SeoLang } from "@/lib/seo/paths";
import { buildMetadata } from "@/lib/seo/metadata";
import { article as articleLd, faqPage } from "@/lib/seo/jsonld";
import { metaDescription, readingMinutes } from "@/lib/seo/text";
import { markdownToPlainText, parseMarkdown, extractHeadings } from "@/lib/content/markdown";
import { availableLangs, hasLanguage, isIndexable, pickLang, type ContentKey } from "@/lib/content/indexing";
import { CONTENT_SECTIONS, contentPath } from "./sections";
import { CONTENT_TOPIC_LABELS, type ContentRecord } from "./definitions";
import { getContentBySlug, listContent } from "./api";

const HOME: Record<SeoLang, string> = { en: "Home", te: "హోమ్" };
const T = {
  en: { updated: "Updated", minRead: "min read", contents: "On this page", related: "Related reading", empty: "Nothing published yet", emptyDesc: "Check back soon.", otherLang: "తెలుగులో చదవండి", read: "Read more", topic: "Topic" },
  te: { updated: "నవీకరణ", minRead: "నిమిషాల పఠనం", contents: "ఈ పేజీలో", related: "సంబంధిత వ్యాసాలు", empty: "ఇంకా ఏమీ ప్రచురించలేదు", emptyDesc: "త్వరలో తిరిగి చూడండి.", otherLang: "Read in English", read: "ఇంకా చదవండి", topic: "అంశం" },
} as const;

const fmtDate = (iso: string, lang: SeoLang) => new Date(iso).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { year: "numeric", month: "long", day: "numeric" });

/** Telugu page text with no English fallback — a Telugu URL must never serve English copy. */
function textFor(rec: ContentRecord, lang: SeoLang) {
  return {
    title: pickLang(rec.title, lang),
    summary: pickLang(rec.summary, lang),
    body: pickLang(rec.body, lang),
    seoTitle: pickLang(rec.seoTitle, lang),
    seoDescription: pickLang(rec.seoDescription, lang),
  };
}

export async function contentDetailMetadata(key: ContentKey, slug: string, lang: SeoLang): Promise<Metadata> {
  const rec = await getContentBySlug(key, slug);
  if (!rec || !hasLanguage(rec, lang)) return { robots: { index: false, follow: false } };
  const t = textFor(rec, lang);
  return buildMetadata({
    title: t.seoTitle || t.title,
    description: t.seoDescription || t.summary || markdownToPlainText(t.body),
    path: contentPath(key, slug),
    lang,
    availableLangs: availableLangs(rec),
    image: rec.images?.[0],
    type: key === "articles" || key === "pilgrim-guides" ? "article" : "website",
    publishedTime: rec.createdAt,
    modifiedTime: rec.updatedAt,
    noindex: !isIndexable(key, rec, lang),
  });
}

export function contentListMetadata(key: ContentKey, lang: SeoLang): Metadata {
  const s = CONTENT_SECTIONS[key];
  return buildMetadata({ title: s.label[lang], description: s.intro[lang], path: s.path, lang, availableLangs: [lang] });
}

export async function ContentListPage({ sectionKey, lang }: { sectionKey: ContentKey; lang: SeoLang }) {
  const section = CONTENT_SECTIONS[sectionKey];
  const t = T[lang];
  const { items } = await listContent(sectionKey, { pageSize: 50 });
  // Telugu index lists only items that really have Telugu copy.
  const visible = items.filter((r) => hasLanguage(r, lang));

  const faqLd = sectionKey === "faqs"
    ? faqPage(visible.map((r) => ({ question: pickLang(r.title, lang), answer: markdownToPlainText(pickLang(r.body, lang)) })))
    : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <SeoBreadcrumbs items={[{ label: HOME[lang], href: localizedPath("/", lang) }, { label: section.label[lang] }]} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{section.label[lang]}</h1>
        <p className="mt-2 text-ink-muted">{section.intro[lang]}</p>

        {visible.length === 0 && <div className="mt-8"><EmptyState title={t.empty} description={t.emptyDesc} /></div>}

        {sectionKey === "faqs" ? (
          <div className="mt-8 flex flex-col gap-3">
            {visible.map((r) => (
              <details key={r.id} className="rounded-[var(--radius-card)] border border-border bg-surface-raised p-4">
                <summary className="cursor-pointer font-medium text-ink">{pickLang(r.title, lang)}</summary>
                <div className="mt-2 text-sm"><Markdown source={pickLang(r.body, lang)} /></div>
                <Link href={localizedPath(contentPath("faqs", r.slug), lang)} className="mt-3 inline-block text-xs text-river-deep underline">Permalink</Link>
              </details>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {visible.map((r) => (
              <Link key={r.id} href={localizedPath(contentPath(sectionKey, r.slug), lang)} className="block">
                <Card hoverable padding="md" className="h-full">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">{CONTENT_TOPIC_LABELS[r.topic]}</p>
                  <h2 className="mt-1 font-semibold text-ink">{pickLang(r.title, lang)}</h2>
                  {pickLang(r.summary, lang) && <p className="mt-2 text-sm text-ink-muted">{pickLang(r.summary, lang)}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <JsonLd data={faqLd} />
    </SiteShell>
  );
}

export async function ContentDetailPage({ sectionKey, slug, lang }: { sectionKey: ContentKey; slug: string; lang: SeoLang }) {
  const rec = await getContentBySlug(sectionKey, slug);
  if (!rec || !hasLanguage(rec, lang)) notFound();

  const section = CONTENT_SECTIONS[sectionKey];
  const t = T[lang];
  const text = textFor(rec, lang);
  const path = localizedPath(contentPath(sectionKey, slug), lang);
  const langs = availableLangs(rec);
  const other: SeoLang = lang === "en" ? "te" : "en";
  const blocks = parseMarkdown(text.body);
  const toc = extractHeadings(blocks);
  const siteUrl = getSiteUrl();

  const related = (await listContent(sectionKey, { topic: rec.topic, pageSize: 4 })).items
    .filter((r) => r.id !== rec.id && hasLanguage(r, lang))
    .slice(0, 3);

  const ld = [
    section.ldType === "Article"
      ? articleLd({ headline: text.title, description: text.summary || undefined, path, lang, image: rec.images?.[0], datePublished: rec.createdAt, dateModified: rec.updatedAt, authorName: rec.authorName || undefined })
      : null,
    sectionKey === "faqs" ? faqPage([{ question: text.title, answer: markdownToPlainText(text.body) }]) : null,
  ];

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <SeoBreadcrumbs
          items={[
            { label: HOME[lang], href: localizedPath("/", lang) },
            { label: section.label[lang], href: localizedPath(section.path, lang) },
            { label: text.title },
          ]}
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{text.title}</h1>
        {text.summary && <p className="mt-3 text-lg text-ink-muted">{text.summary}</p>}
        <p className="mt-3 text-sm text-ink-muted">
          {t.updated} {fmtDate(rec.updatedAt, lang)} · {readingMinutes(text.body)} {t.minRead} · {t.topic}: {CONTENT_TOPIC_LABELS[rec.topic]}
          {langs.includes(other) && (
            <> · <Link href={localizedPath(contentPath(sectionKey, slug), other)} hrefLang={other === "te" ? "te" : "en"} className="text-river-deep underline">{t.otherLang}</Link></>
          )}
        </p>
        <div className="mt-4"><ShareButtons title={text.title} path={path} siteUrl={siteUrl} /></div>

        {toc.length >= 3 && (
          <nav aria-label={t.contents} className="mt-6 rounded-[var(--radius-card)] border border-border bg-river-mist p-4 text-sm">
            <p className="font-semibold text-ink">{t.contents}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-river-deep underline">{h.text}</a></li>)}
            </ul>
          </nav>
        )}

        <Markdown source={text.body} />

        {sectionKey === "service-pages" && rec.ctaPath && (
          <div className="mt-8">
            <Link href={localizedPath(rec.ctaPath, lang)} className="inline-flex rounded-lg bg-river-deep px-5 py-3 text-sm font-medium text-white hover:bg-[#0b3e4b]">
              {pickLang(rec.ctaLabel, lang) || t.read} →
            </Link>
          </div>
        )}

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-ink">{t.related}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {related.map((r) => (
                <li key={r.id}><Link className="text-river-deep underline" href={localizedPath(contentPath(sectionKey, r.slug), lang)}>{pickLang(r.title, lang)}</Link></li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <JsonLd data={ld} />
    </SiteShell>
  );
}
