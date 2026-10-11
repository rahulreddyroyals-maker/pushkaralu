# Sprint 11 — Advertising, Analytics & Business Dashboard

## What was built
**Advertising (admin-only catalogs):** Advertisers, Ad Campaigns, Ad Placements (Admin → Platform). Formats: banner, homepage promotion, sponsored listing, sponsored article. Slots: `home_hero`, `home_featured`, `listings_top`, `content_inline`, `articles_featured` (defined in code; admins switch a slot on/off and set max ads).
Campaign fields: advertiser, format, placement, status, start/end (India dates, inclusive), budget, pricing (flat / CPC / CPM), rate, weight, creative.
**Approval:** *published = approved*. A campaign serves only when published **and** status ACTIVE **and** inside its dates **and** its advertiser is published + ACTIVE **and** budget remains. One definition (`effectiveStatus`) is shared by the ad server and the reports.
**Analytics:** privacy-light daily counters — page views, entity views (provider, hotel, purohit, ghat, temple…), searches, app opens, clicks (call/directions/website/inquiry), shares, inquiry starts, ad impressions/clicks. Bookings and revenue come from the existing `bookings` collection.
**Dashboards:** `/admin/analytics` (admins only) and `/provider/analytics` (each owner sees only their own listings and campaigns). Business view: profile views, clicks, inquiries started, leads, bookings, booking revenue, per-listing funnel rates, campaign performance.

## Privacy and access
- `/admin/analytics` and `/api/admin/analytics` require ADMIN or SUPER_ADMIN (editors/moderators are staff but are refused). Advertising catalogs are `adminOnly`: no public API, not in the sitemap, admin screens redirect non-admins.
- `/api/provider/analytics` has **no id parameter**; the owner is the signed-in uid. A user with no listings gets empty results.
- Counters hold no visitor identifier, IP or user id. Search terms containing emails or long digit runs are dropped. `/admin`, `/provider`, `/login`, `/profile`, `/bookings`, `/family`, `/api` and `/r/` are never tracked. Bots dropped. Honours Do Not Track, Global Privacy Control and `NEXT_PUBLIC_ANALYTICS_ENABLED=false`.
- Reports return counts only — never customer names, phones or lead text.
- Ads are labelled "Sponsored / ప్రాయోజితం", use `rel="sponsored noopener"`, and click through `/r/ad/[id]` (destination from the stored campaign, so no open redirect; one counted click per visitor per campaign per 10 min).
- Articles have an optional **Sponsored by** field: shows a disclosure and marks external links `rel="sponsored"`.

## Environment
| Variable | Purpose |
|---|---|
| `ANALYTICS_SALT` | random string used to hash visitor ids for rate limiting (falls back to `AI_RATE_SALT`) |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `false` = switch tracking off |

## Firestore
New collections (Admin SDK only — keep **closed** in `firestore.rules`): `analyticsCounters`, `adTotals`, `analyticsRateLimits`, `advertisers`, `adCampaigns`, `adPlacements`. No composite index is needed (equality-only queries plus single-field ranges). Optional TTL on `analyticsRateLimits.expiresAt`.

## Running a campaign
1. Admin → Advertisers → New (set **Owner user id** if the business should see results in its dashboard) → Publish (approve).
2. Admin → Ad Campaigns → New, choose advertiser, format, placement, dates, budget, creative → set status **Active** → Publish.
3. Optional: Ad Placements → one record per slot to switch it off or change max ads.

## Known limits
- Analytics run in the browser: ad blockers hide some traffic and a script can inflate counts. Impressions are therefore **unaudited**; prefer FLAT or CPC pricing. Spend shown is an estimate.
- Range reads are capped (20,000 counter rows); a "partial" notice appears if hit.
- Business dashboard reads up to 5,000 bookings/leads per owner.
- "Inquiries" = form started; "leads" = submitted lead records. Both are shown.
- No invoicing/payments for advertisers, self-serve advertiser portal, or image-size validation.
- Telugu month names are not handled by the Sprint 10 assistant guard (unchanged).
