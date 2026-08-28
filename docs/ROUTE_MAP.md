# Pushkaralu — Route Map

## Web (Next.js App Router)

Route segments are centralized in `src/config/app.ts` (`ROUTES`) so they're
referenced, not retyped, across the codebase (nav, sitemap generator,
breadcrumbs).

| Route | Type | SEO priority | Sprint |
|---|---|---|---|
| `/` | Static/ISR | High | 0 (placeholder) → real content later |
| `/godavari-pushkaralu-2027` | SSG | Critical | Sprint 1–2 |
| `/godavari-pushkaralu-2027-dates` etc. (spec §26 family) | SSG | Critical | Post Sprint 2, content-engine driven |
| `/pushkaralu` | SSG | High | Sprint 1 |
| `/events`, `/events/{eventId}` | Dynamic (SSR) | High | Sprint 3 — **built** |
| `/events/{eventId}/ghats`, `/events/{eventId}/ghats/{ghatId}` | Dynamic (SSR) | High | Sprint 3 — **built**, see note below |
| `/temples`, `/temples/{templeId}` | Dynamic (SSR) | High | Sprint 3 — **built** |
| `/hotels`, `/hotels/{slug}` | ISR | High | Sprint 5 |
| `/purohits`, `/purohits/{slug}` | ISR | Critical (marketplace) | Sprint 4 |
| `/rituals`, `/rituals/{slug}` | SSG | Medium | Sprint 4 |
| `/puja-services` | SSG | Medium | Sprint 4 |
| `/travel`, `/taxis` | ISR | Medium | Later transport sprint |
| `/boats`, `/boat-rides` | ISR | Medium | Later |
| `/restaurants` | ISR | Medium | Later |
| `/parking` | ISR (status changes) | Low-Medium | With Ghats/Emergency |
| `/hospitals`, `/emergency` | ISR, admin-verified only | Medium | Sprint 8 |
| `/events-calendar` | SSG/ISR | Medium | Sprint 1 |
| `/news`, `/news/{slug}` | SSG/ISR | High (freshness) | Later content sprint |
| `/tourism`, `/tourism/{slug}` | SSG | Medium | Later |
| `/packages`, `/packages/{slug}` | ISR | Medium | Later |
| `/businesses`, `/businesses/{slug}` | ISR | Low-Medium | Sprint 5 |
| `/lost-and-found` | Client-rendered (no SEO need, moderated) | None | Sprint 8 |
| `/about`, `/contact`, `/terms`, `/privacy`, `/refund-policy` | Static | Low | Legal-pages sprint |
| `/partner-with-us`, `/register-business` | SSG form | Medium | Sprint 5 |

## Mobile (React Native, Sprint 7+)

Bottom navigation per spec §11:
```
Home → Explore → Services → Bookings → Profile
```
Home tab composes: event countdown, ghat status, quick services, nearby
services, notifications — each a thin wrapper around the same
`features/<name>/api.ts` functions used on web.

## Deviation from the original flat `/ghats` route

The original spec listed `/ghats`, `/ghats/{slug}` as flat top-level
routes. Sprint 3 implemented them nested under their event instead —
`/events/{eventId}/ghats`, `/events/{eventId}/ghats/{ghatId}` — because
ghats are genuinely event-scoped data in Firestore (see
`docs/DATABASE_SCHEMA.md`: `events/{eventId}/ghats/{ghatId}` as a
subcollection), and the spec's own "must support multiple future
Pushkaralu events" requirement means a flat `/ghats` route would need an
implicit "which event" answered some other way (a default/current event
concept that doesn't exist yet). Nesting under the event makes that
explicit instead of hidden. Revisit if a single-event-at-a-time UX turns
out to be preferred once there's real usage data.

## Rendering strategy — force-dynamic, not ISR (Sprint 3 update)

The Event/Ghat/Temple pages above use `export const dynamic =
"force-dynamic"` rather than the ISR (`revalidate`) originally planned in
this doc. Reason: ISR requires Next.js to attempt prerendering these
pages at `next build` time, which — since these pages read via the Admin
SDK — requires live Firebase Admin credentials to be present in **every**
build environment, including this one (no real Firebase project). Ghat
crowd status also genuinely needs to stay fresh rather than served from a
cache window. `force-dynamic` means every request hits Firestore directly
(SSR, no build-time dependency) — worth revisiting with
`generateStaticParams` + ISR once deployed against a real project where
build-time credentials are available and traffic patterns justify the
optimization.

## Admin Dashboard (Sprint 3 update — Events/Ghats/Temples built)

Desktop-first, `/admin` segment behind the server-side auth guard added
in Sprint 2 (`src/app/admin/layout.tsx` — `getServerUser()` +
`canAccessAdminDashboard()`, not just role-gated UI).

Built in Sprint 3:
- `/admin/events`, `/admin/events/new`, `/admin/events/{id}/edit` (also
  hosts the Announcements panel)
- `/admin/ghats` (event picker, since ghats are event-scoped) →
  `/admin/events/{id}/ghats`, `/admin/events/{id}/ghats/new`,
  `/admin/events/{id}/ghats/{ghatId}/edit` (also hosts the
  MODERATOR-level crowd status control, separate from the ADMIN-level
  full-edit form)
- `/admin/temples`, `/admin/temples/new`, `/admin/temples/{id}/edit`

Remaining modules per spec §25 (Users, Hotels, Purohits, Services,
Transport, Boats, Businesses, Bookings, Payments, Reviews, News, Lost &
Found, Emergency, Advertisements, Notifications, SEO, Settings, Reports,
Audit Logs) land as their corresponding feature sprint does, not built
ahead of the feature itself.

## Note on Scope

`/` (homepage shell), the full auth flow, and now Events/Ghats/Temples
(public + admin) exist as working code. Everything else in the table
above is still the target map for future sprints, not a claim that those
routes exist yet.
