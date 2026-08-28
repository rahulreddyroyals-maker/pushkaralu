# Pushkaralu — Event, Ghat & Temple Platform (Sprint 3)

Status: implemented and verified (build/lint/typecheck/unit tests all
passing, error boundaries confirmed working in a production build).

## Scope note

Originally planned as "Ghat Directory + Crowd Management" only (see
`docs/SPRINT_DEPENDENCY_MAP.md`). Expanded at explicit request to also
cover Events and Temples, full admin CRUD (not just public display), and
mobile — this doc covers the delivered scope, not the originally-narrower
plan.

## Data model

Event-centric root, provider-agnostic leaves — as designed in
`docs/DATABASE_SCHEMA.md` back in Sprint 0:
- `events/{eventId}` — root entity, now with a `published: boolean` field
  (separate from the `status` lifecycle field — a `DRAFT`-equivalent
  event can still be `UPCOMING`/`ACTIVE`/etc. once published)
- `events/{eventId}/ghats/{ghatId}` — event-scoped subcollection
- `temples/{templeId}` — top-level, event-agnostic (a temple isn't tied
  to one Pushkaralu)

**Route structure deviates from the original spec's flat `/ghats`** —
see `docs/ROUTE_MAP.md` for the full reasoning. Short version: ghats
belong to a specific event in the data model, so the URLs
(`/events/{eventId}/ghats/...`) say so explicitly instead of hiding an
implicit "current event" assumption.

## Publish/unpublish

Every entity (Event, Ghat, Temple, Announcement) has a `published`
boolean, separate from its content. Unpublished content is staff-only —
enforced in `firestore.rules` (`resource.data.published == true ||
isStaff()`) for any direct client reads, and in application code
(`includeUnpublished` parameter) for the Server Component reads that
actually power the pages in this sprint. New entities are always created
unpublished — publishing is a deliberate, separate, audited action via
the `/publish-state` Route Handlers.

## Crowd status — the "don't fabricate live data" requirement

Spec Module 3 explicitly requires: *"Never present manually entered
information as automatically live. Clearly show 'Updated X minutes
ago.'"* `CrowdStatusBadge` (`src/components/ui/CrowdStatusBadge.tsx`)
computes and displays that relative time from `crowdStatusUpdatedAt`,
which is written server-side whenever `PATCH
/api/admin/events/{id}/ghats/{ghatId}/crowd-status` succeeds — never
client-set, never silently stale without saying so.

Crowd status updates are deliberately **MODERATOR-level**, not
ADMIN-only — a lower bar than full ghat edits, matching the operational
reality that crowd status needs frequent updates from more people than
full content edits do (see `docs/ROLES_PERMISSIONS.md`). There's a
specific test (`crowd-status/route.test.ts`) proving `EDITOR` — a staff
role, but the wrong one — gets a 403 here, while `MODERATOR` succeeds.

## Search, filtering, pagination

- **Pagination**: cursor-based on `createdAt` (`src/lib/pagination.ts`),
  not offset-based — Firestore doesn't support offsets natively. The
  cursor exposed to clients is a plain ISO string, safe to put in a URL
  or JSON response.
- **Search**: prefix match on a lowercased `nameLower` field written at
  create/update time — not full-text search (Firestore has none
  natively). Search and facility-filter are mutually exclusive at the
  query level to avoid needing an impractical number of Firestore
  composite indexes for a Sprint 3 dataset; both are documented in
  `src/features/ghats/api.ts`.
- Composite indexes this sprint's queries actually need are in
  `firestore.indexes.json` — deploy with `firebase deploy --only
  firestore:indexes` before relying on facility filtering or search in
  production.

## Maps

`MapEmbed` (`src/components/ui/MapEmbed.tsx`) uses the Google Maps
Embed API (a plain iframe) when `NEXT_PUBLIC_MAPS_PROVIDER_API_KEY` is
set. Without a key — the default state, since no real key exists yet —
it shows coordinates and an "Open in Google Maps" link instead of a
broken or fake-looking map.

## Rendering strategy — force-dynamic, not ISR

All six new public pages use `export const dynamic = "force-dynamic"`
rather than the ISR originally planned in `docs/ROUTE_MAP.md`. Reason:
ISR requires build-time prerendering, which needs live Firebase Admin
credentials in the build environment — this sandbox has none. Ghat crowd
status also genuinely needs to stay fresh. Every request hits Firestore
directly instead. Revisit with `generateStaticParams` + ISR once
deployed against a real project with build-time credentials available.

## Error handling

Added `error.tsx` boundaries for `/events`, `/temples`, and `/admin`
route segments (they cascade to all nested routes). Verified in an
actual **production build** (`next build && next start`), not just dev
mode — Next.js's dev server always shows a full debug overlay regardless
of `error.tsx`, so testing only in dev would have been misleading. With
deliberately-invalid Firebase credentials, the pages correctly show the
on-brand `ErrorState` component with full site chrome intact, not a raw
crash.

## Demo data

`npm run seed` (`scripts/seed-demo-data.ts`) creates one demo event,
three demo ghats, one announcement, and two demo temples. Every document
is tagged `isDemoData: true` and prefixed `[Demo]` in its English name,
per spec §37 ("use clearly marked demo data"). Uses its own minimal
Admin SDK bootstrap rather than importing the app's guarded
`src/lib/firebase/admin.ts`, since that module's `server-only` import
correctly refuses to load outside Next.js's bundler context (see the
comment in the script for why importing it anyway would have been the
wrong fix).

## Mobile

The Explore tab (previously a placeholder) now reads real published
Events and Temples via the Firestore JS SDK directly — Expo Go
compatible, no native module or custom dev client needed. Tapping an
event drills into its ghats via simple local-state view-switching rather
than a full navigation stack, to keep this sprint's mobile scope
proportionate. `src/lib/data.ts` mirrors the web feature shape loosely
but is intentionally minimal — read-only, published-content-only, no
admin capability (mobile admin was never in scope).

## Testing — what ran here vs. what needs a real project

**Ran and passing (62/62 tests total across the app, `npm test`):**
new suites this sprint: `pagination.test.ts`, `requireApiRole.test.ts`,
and `crowd-status/route.test.ts` (the role-boundary test described
above).

**Not testable without a real Firebase project** (same limitation
disclosed in Sprint 2): the actual Firestore rules changes for
publish-state visibility aren't covered by a new emulator test in this
sprint — `src/__tests__/firestore.rules.test.ts` from Sprint 2 still
covers the role-field-immutability and audit-log rules, which are
unchanged. Extending that suite with publish/unpublish visibility cases
would be a reasonable next step, run via `npm run test:rules` on a
machine with normal internet access.

## Explicitly deferred

- Admin listing UI for announcements beyond the inline panel on the
  event edit page (no standalone `/admin/announcements`)
- Bulk demo-data cleanup UI (the seed script's `isDemoData: true` tag
  makes this a simple future query, not built as a UI this sprint)
- Mobile ghat/temple detail screens (list view only — matches "browse,
  don't yet book" scope; booking flows are a later sprint regardless)
