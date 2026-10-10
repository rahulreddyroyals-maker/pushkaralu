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
import type { SeoLang } from "@/lib/seo/paths";
import { localizedPath } from "@/lib/seo/paths";
import { buildMetadata } from "@/lib/seo/metadata";
import { event as eventLd, faqPage, itemList } from "@/lib/seo/jsonld";
import { markdownToPlainText } from "@/lib/content/markdown";
import { contentPath } from "@/features/content/sections";
import { daysUntil, describeTiming, eventSlug, hubPath, hubTitle, hubUrlPath, HUB_COPY, HUB_TOPICS, type HubView } from "./hub";
import { hubIsIndexable, loadHubData, resolveHub } from "./data";

const fmt = (iso: string, lang: SeoLang) => new Date(iso).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { year: "numeric", month: "long", day: "numeric" });

const T = {
  en: { home: "Home", reading: "Related reading", faq: "Frequently asked questions", none: "Nothing published for this yet", noneDesc: "Listings appear here once they are approved and published.", starts: "Starts", ends: "Ends", length: "Length", days: "days", river: "River", more: "Explore", viewDetails: "View details", crowdNote: "Crowd, open/closed and parking status are entered by event staff and shown with a timestamp on each ghat's own page — not here, where pages are cached." },
  te: { home: "హోమ్", reading: "సంబంధిత వ్యాసాలు", faq: "తరచుగా అడిగే ప్రశ్నలు", none: "దీనికి ఇంకా ఏమీ ప్రచురించలేదు", noneDesc: "ఆమోదించి ప్రచురించిన తర్వాత జాబితాలు ఇక్కడ కనిపిస్తాయి.", starts: "ప్రారంభం", ends: "ముగింపు", length: "వ్యవధి", days: "రోజులు", river: "నది", more: "మరిన్ని చూడండి", viewDetails: "వివరాలు", crowdNote: "రద్దీ, తెరిచి/మూసి ఉన్న స్థితి, పార్కింగ్ వివరాలను సిబ్బంది నమోదు చేస్తారు; ప్రతి ఘాట్ పేజీలో సమయంతో చూపబడతాయి." },
} as const;

async function load(slug: string, lang: SeoLang) {
  const hit = await resolveHub(slug);
  if (!hit) return null;
  const data = await loadHubData(hit.event, hit.view, lang);
  return { ...hit, data, slug: eventSlug(hit.event) };
}

export async function hubMetadata(urlSlug: string, lang: SeoLang): Promise<Metadata> {
  const hit = await load(urlSlug, lang);
  if (!hit) return { robots: { index: false, follow: false } };
  const { event, view, data, slug } = hit;
  const name = event.name[lang] || event.name.en;
  const description =
    view === "overview"
      ? event.seo?.description?.[lang] || event.description[lang]
      : `${HUB_COPY[view].intro[lang]}${data.items.length ? ` (${data.items.length})` : ""}`;
  return buildMetadata({
    title: view === "overview" ? event.seo?.title?.[lang] || hubTitle(view, lang, name) : hubTitle(view, lang, name),
    description,
    path: hubPath(slug, view),
    lang,
    availableLangs: ["en", "te"],
    image: event.featuredImage,
    noindex: !hubIsIndexable(view, data),
  });
}

export async function HubPage({ urlSlug, lang }: { urlSlug: string; lang: SeoLang }) {
  const hit = await load(urlSlug, lang);
  if (!hit) notFound();
  const { event, view, data, slug } = hit;
  const t = T[lang];
  const name = event.name[lang] || event.name.en;
  const now = new Date();
  const path = hubUrlPath(slug, view, lang);
  const siteUrl = getSiteUrl();
  const copy = HUB_COPY[view];

  const ld = [
    view === "overview" || view === "dates"
      ? eventLd({ name, description: event.description[lang], startDate: event.startDate, endDate: event.endDate, path, image: event.featuredImage, status: event.status }, siteUrl)
      : null,
    view !== "overview" && view !== "dates" ? itemList(hubTitle(view, lang, name), data.items.map((i) => ({ name: i.name, path: i.href })), siteUrl) : null,
    faqPage(data.faqs.map((f) => ({ question: f.question, answer: markdownToPlainText(f.answer) }))),
  ];

  const lengthDays = Math.max(1, daysUntil(event.endDate, new Date(event.startDate)) + 1);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <SeoBreadcrumbs
          items={[
            { label: t.home, href: localizedPath("/", lang) },
            ...(view === "overview" ? [{ label: name }] : [{ label: name, href: hubUrlPath(slug, "overview", lang) }, { label: copy.label[lang] }]),
          ]}
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{hubTitle(view, lang, name)}</h1>
        <p className="mt-3 text-ink-muted">{copy.intro[lang]}</p>
        <p className="mt-2 font-data text-sm text-ink-muted">
          {fmt(event.startDate, lang)} – {fmt(event.endDate, lang)} · {describeTiming(event.startDate, event.endDate, now, lang)}
        </p>
        <div className="mt-4"><ShareButtons title={hubTitle(view, lang, name)} path={path} siteUrl={siteUrl} /></div>

        <nav aria-label={t.more} className="mt-6 flex flex-wrap gap-2">
          {(["overview", ...HUB_TOPICS] as HubView[]).map((v) => (
            <Link key={v} href={hubUrlPath(slug, v, lang)} aria-current={v === view ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${v === view ? "border-river-deep bg-river-deep text-white" : "border-border text-ink hover:bg-river-mist"}`}>
              {HUB_COPY[v].label[lang]}
            </Link>
          ))}
        </nav>

        {(view === "overview" || view === "dates") && (
          <Card padding="md" className="mt-8">
            <dl className="grid gap-4 sm:grid-cols-4 text-sm">
              <div><dt className="text-ink-muted">{t.starts}</dt><dd className="font-semibold text-ink">{fmt(event.startDate, lang)}</dd></div>
              <div><dt className="text-ink-muted">{t.ends}</dt><dd className="font-semibold text-ink">{fmt(event.endDate, lang)}</dd></div>
              <div><dt className="text-ink-muted">{t.length}</dt><dd className="font-semibold text-ink">{lengthDays} {t.days}</dd></div>
              <div><dt className="text-ink-muted">{t.river}</dt><dd className="font-semibold text-ink">{event.river}</dd></div>
            </dl>
          </Card>
        )}

        {view === "overview" && <p className="mt-6 leading-7 text-ink">{event.description[lang] || event.description.en}</p>}

        {view !== "overview" && view !== "dates" && (
          <section className="mt-8">
            {data.items.length === 0 ? (
              <EmptyState title={t.none} description={t.noneDesc} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.items.map((i) => (
                  <li key={i.id}>
                    <Link href={i.href} className="block">
                      <Card hoverable padding="md" className="h-full">
                        <p className="font-semibold text-ink">{i.name}</p>
                        {i.detail && <p className="mt-1 text-sm text-ink-muted">{i.detail}</p>}
                        <p className="mt-2 text-xs text-river-deep">{t.viewDetails} →</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {(view === "ghats" || view === "parking") && <p className="mt-4 text-xs text-ink-muted">{t.crowdNote}</p>}
          </section>
        )}

        {data.reading.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink">{t.reading}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {data.reading.map((r) => (
                <li key={`${r.kind}-${r.slug}`}><Link className="text-river-deep underline" href={localizedPath(contentPath(r.kind, r.slug), lang)}>{r.title}</Link></li>
              ))}
            </ul>
          </section>
        )}

        {data.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink">{t.faq}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {data.faqs.map((f) => (
                <details key={f.slug} className="rounded-[var(--radius-card)] border border-border bg-surface-raised p-4">
                  <summary className="cursor-pointer font-medium text-ink">{f.question}</summary>
                  <div className="mt-2 text-sm"><Markdown source={f.answer} /></div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
      <JsonLd data={ld} />
    </SiteShell>
  );
}
