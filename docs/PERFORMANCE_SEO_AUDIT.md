# Performance and SEO audit (Sprint 12)

## Performance
| Check | Result |
|---|---|
| Bundle | Largest client chunk ~523 KB (Firebase auth/client SDK); total static chunks 2.9 MB uncompressed across all routes. Firebase client is imported only where sign-in/upload is needed. Acceptable; revisit with `ANALYZE` if Lighthouse flags it. |
| Images | Header/footer logo reduced from 288 KB to 79 KB source and rendered via `next/image` (resized/WebP by Vercel); social image is a 49 KB JPEG (was 1.4 MB PNG). Mobile assets quantized (icon/splash 1.1 MB to 0.46 MB, home logo 453 KB to 303 KB). |
| Firestore reads | All public lists are paginated (`pageSize`, 46 call sites). No client Firestore reads or `onSnapshot` listeners at all (no leaked listeners). Assistant data is memoised per request. |
| Caching | Content pages use ISR (`revalidate` 300-600 s) and the home page is statically cached again after the Sprint 12 i18n fix. 75 operational pages (crowd status, emergency, bookings) are intentionally `force-dynamic` so data is never stale. |
| Indexes | 123 composite indexes defined; missing-index errors are now logged with an explicit "MISSING INDEX" hint. |
| Mobile | No Firestore SDK in the app (REST + Bearer), lists use paged endpoints, push optional. WebView only loaded for payment. |

## SEO
Verified by building and requesting pages from a production build:
- `robots.txt`: allows crawl, disallows admin/api/profile/provider/bookings/family/notifications/login/register; points to the sitemap.
- `sitemap.xml`: events, hubs, ghats, CMS content (indexable pages only), catalog details, temples/hotels/purohits/rituals, plus static + legal pages; one failing data source never breaks it.
- Canonical + hreflang (en/te) built by one function (`buildMetadata`); legal/about/contact now use it. JSON-LD (WebSite, Organization, page schemas) present on the home page.
- Internal links: every `ROUTES.*` and header/footer link resolves to a real page (script check; the 5 previously 404 footer links are fixed).
- Mobile usability: responsive layout, viewport meta from Next defaults; header collapses below 1280 px.
- **Must do on production:** set `NEXT_PUBLIC_SITE_URL=https://your-domain` in Vercel. Without it canonical URLs, sitemap and robots point at `http://localhost:3000`. Submit the sitemap in Google Search Console.
