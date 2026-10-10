# Sprint 9 — SEO, Content Engine & Social Sharing

## What was built
- **SEO core** (`src/lib/seo/*`, pure + tested): site URL (`NEXT_PUBLIC_SITE_URL`), `buildMetadata` (title, description, canonical, hreflang, Open Graph, Twitter, robots), JSON-LD builders (BreadcrumbList, FAQPage, Article, Event, ItemList, WebSite, Organization) with `<`-escaping serializer, sitemap builder, share-link builders.
- **Root layout**: `metadataBase`, title template (`%s | Pushkaralu`), default OG/Twitter image, WebSite + Organization JSON-LD.
- **`/sitemap.xml`, `/robots.txt`**: sitemap lists static pages, event hubs, ghat/catalog/legacy detail pages and CMS content that passes the indexability rules, with Telugu hreflang alternates. Robots blocks admin, API, profile, bookings, family, notifications, login/register.
- **Event SEO hub** (`/{event-slug}` and `/{event-slug}-{dates|ghats|hotels|purohits|rituals|travel|parking|temples}`, plus `/te/...`): slug comes from the event's own admin-entered canonical path (fallback `river-pushkaralu-year`). Pages are assembled from real database records; list pages with nothing to show are `noindex` and omitted from the sitemap. `/events/{id}` now canonicalises to the hub.
- **Content CMS** (admin → *Content & SEO*): Articles (`/articles`), Pilgrim guides (`/pilgrim-guides`), FAQs (`/faqs`), Location pages (`/locations`), Service pages (`/services`). English required, Telugu optional; unique `slug` enforced server-side (409 on clash); per-page SEO title/description overrides and a `noindex` switch. Bodies are Markdown rendered safely (no raw HTML, only http/https/mailto/tel/relative links).
- **Telugu**: `/te/...` pages exist only when Telugu title **and** body are written; hreflang is emitted only then. Telugu URLs never fall back to English text.
- **Social**: WhatsApp, Facebook and copy-link buttons on content and hub pages (canonical absolute URL); OG/Twitter tags on every page built via `buildMetadata`.
- **Search-intent / no keyword stuffing**: titles state the user's question ("… dates and schedule", "… parking: locations, capacity and walking distance"); copy is generated from real data; FAQ/answer-first fields guide editors; thin pages (< 120 words articles/guides, 60 location/service, 12 FAQ) are `noindex` and the admin list says so.

## Honest limits
- Crowd, open/closed and parking status are manual and time-stamped; hub pages are cached (10 min) so they link to the ghat page for status instead of showing it.
- Event JSON-LD omits `location` because events carry no venue field; add one in a later sprint to qualify for Google event rich results.
- `og-default.jpg` is referenced but not shipped — add your own 1200×630 image at `public/og-default.jpg`.
- Telugu hub copy is a first translation; have a native speaker review `HUB_COPY` in `features/seoHub/hub.ts` and `sections.ts`.

## Setup
1. `NEXT_PUBLIC_SITE_URL=https://your-domain` (no trailing slash) in the environment — required for correct canonicals/sitemap.
2. Add `public/og-default.jpg`.
3. Firestore composite indexes (for each of `contentArticles`, `contentGuides`, `contentFaqs`, `contentLocations`, `contentServices`):
   - `published` ASC, `createdAt` DESC
   - `topic` ASC, `published` ASC, `createdAt` DESC
   - `published` ASC, `nameLower` ASC (admin/title search)
   (Firebase prints a one-click link in the server log the first time each query runs.)
4. Admin: create content, publish, check `/sitemap.xml`; submit it in Google Search Console and Bing Webmaster Tools.

## Tests
`lib/seo/seo.test.ts`, `lib/seo/sitemap.test.ts`, `lib/content/markdown.test.ts`, `lib/content/indexing.test.ts`, `features/content/definitions.test.ts`, `features/seoHub/hub.test.ts`, and the extended `features/catalog/definitions.test.ts`.
