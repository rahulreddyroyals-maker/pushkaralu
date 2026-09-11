# Pushkaralu — Hotels, Purohits & Local Services Marketplace (Sprint 4)

Status: implemented and verified (build/lint/typecheck/unit tests all
passing, error boundaries and auth gates confirmed working in a
production build).

## Scope note

Originally planned as two separate sprints (5: Purohit Directory, 6:
Hotels + Business Registration — see `docs/SPRINT_DEPENDENCY_MAP.md`).
Delivered together in one sprint at explicit request, since Hotels,
Purohits, and Businesses all need the same provider-application →
admin-approval → role-grant pipeline — building that pipeline three
times (once per sprint) would have meant either duplicating it or
awkwardly retrofitting Sprint 5's version when Sprint 6 needed the same
thing.

## The core mechanism: application → approval → role grant

This is the piece every other decision in this sprint serves:

1. Any signed-in `USER` can create a Hotel/Purohit/Business listing —
   this **is** the "become a provider" application. It always starts
   `approvalStatus: PENDING` (see `createHotel`/`createPurohit`/
   `createBusiness`) and grants no role.
2. Firestore rules (`firestore.rules`) only allow **public read** of a
   listing once `approvalStatus == 'VERIFIED'` — a pending or rejected
   application is visible only to its owner and staff. This was a real
   bug I caught and fixed before it shipped: the rules initially still
   said `allow read: if true` from an earlier sprint's placeholder.
3. An admin approves via `/admin/{hotels,purohits,businesses}` — a
   simple queue UI, not a full edit form (the owner edits their own
   content via `/provider/...`; admin's job is the approve/reject
   decision, not ghost-writing the listing).
4. On `PATCH .../approval` with `approvalStatus: VERIFIED`, the route
   calls the **same shared `assignRole()` function** used by
   `/api/admin/users/[uid]/role` (extracted this sprint — see
   `src/lib/auth/assignRole.ts`) to grant the owner the matching role:
   `HOTEL_OWNER`, `PUROHIT`, or — for Businesses — whichever role the
   listing's `category` maps to (`BUSINESS_CATEGORY_ROLE` in
   `features/businesses/types.ts`: taxi/travel_operator →
   `TRAVEL_OPERATOR`, boat → `BOAT_OPERATOR`, everything else →
   `BUSINESS_OWNER`). One authorization path, not three copies that
   could quietly drift apart on the privilege-escalation check.
5. Rejecting or suspending a listing does **not** auto-revoke the role —
   a provider might own several listings; role revocation is a
   separate, deliberate admin action via the direct role endpoint.

## Why Businesses is one collection, not six

Spec Modules 6/7/9/20 (taxis, travel operators, boats, restaurants,
local businesses, guides) all describe the same shape: name,
description, location, contact, category-specific pricing note. Rather
than six near-identical collections/features/pages, there's one
`businesses` collection with a `category` field, one `BusinessForm`,
one `BusinessListClient`, and one canonical `/businesses/{id}` detail
route that every category page's cards link to — `/travel`, `/boats`,
`/restaurants`, `/businesses` (local businesses), and `/guides` are
thin pages that each just pass a different `category` filter into the
shared components.

**Real bug caught here**: the Travel page needs to show *two*
categories together (taxi + travel_operator). My first pass merged two
separate query results for the initial server-render but the client
component's search/pagination would have silently narrowed back to one
category on the first search — a real, shippable bug. Fixed by adding
proper multi-category support to `listBusinesses()` via Firestore's
`in` operator, so the initial render and every subsequent client
interaction stay consistent.

## Privacy: "do not expose private provider information unnecessarily"

Every listing type has a `contactPhone` field, but no public detail
page renders it. The **only** way a visitor reaches a provider is the
`LeadForm` component (`src/components/marketplace/LeadForm.tsx`) — an
inquiry that requires the visitor to sign in and leave their own
callback number. The provider sees inquiries in their dashboard
(`/provider/leads`) and calls back directly.

This protection is UI-level, not data-level — documented plainly in
`Hotel.contactPhone`'s comment: once a listing is `VERIFIED`, the whole
Firestore document (contact phone included) is readable by anyone
querying it directly via the client SDK, since Firestore rules can't
restrict individual fields without splitting into a separate private
subdocument. That split is a reasonable future hardening step, not done
here — flagged honestly rather than implied as solved.

## Reviews — not yet booking-gated

Spec's original design intent (`docs/DATABASE_SCHEMA.md`) ties reviews
to completed bookings. Since the Booking module doesn't exist yet (see
`docs/SPRINT_DEPENDENCY_MAP.md`), any signed-in user can review any
provider for now — documented in `features/reviews/types.ts` as a gap
to close once bookings ship, not silently left as if it were the
intended final design.

## Storage rules — cross-service Firestore reads

`storage.rules` now lets a listing's owner (not just staff) upload
images to their own `images/{hotels,purohits,businesses}/{id}/` path,
verified via a cross-service `firestore.get()` call checking the
document's `ownerId`/`userId` field against `request.auth.uid`. New
listings can't have images until they're saved once (same "save first,
then edit to add photos" pattern as Ghats/Temples in Sprint 3) — the
entity ID needs to exist in Firestore before the ownership check has
anything to read.

## Testing — what ran here vs. what needs a real project

**Ran and passing (63/63 tests total, `npm test`)**: new suites this
sprint cover the hotel approval route specifically — proving
`MODERATOR` is denied (approval is ADMIN-level, not moderator-level,
unlike ghat crowd status), and that verification both sets
`approvalStatus` **and** calls `assignRole()` with the correct role,
while rejection does neither.

**Verified in a production build** (`next build && next start`, same
methodology as Sprint 3 — dev mode's debug overlay would hide whether
error boundaries really work): `/hotels`, `/purohits`, `/rituals`, and
`/travel` all show the on-brand `ErrorState` (not a raw crash) when
Firestore is unreachable, each with its own tailored message. `/admin/
{hotels,purohits,businesses,rituals}` and `/provider` all correctly
redirect to `/login` for an unauthenticated visitor.

**Not testable without a real Firebase project**: the Firestore Rules
emulator suite from Sprint 2 hasn't been extended with cases for the
new approval-status visibility rules or the Storage cross-service
ownership checks — a reasonable next step, run via `npm run test:rules`
on a machine with normal internet access (this sandbox blocks Google's
emulator download, as established in Sprint 2).

## Explicitly deferred

- Admin edit access to provider content (admin can approve/reject but
  not rewrite a hotel's description, say) — if that's needed, it's a
  small addition reusing the existing `HotelForm`/`PurohitForm`/
  `BusinessForm` components with an admin-authorized route instead of
  the owner-authorized one.
- Availability *scheduling* for Purohits — currently a free-text note
  field, not a real calendar (spec's Module 5 "availability" bullet is
  satisfied at the level a free-text field can, not with a booking
  calendar — that's the Booking module).
- Denormalized review-count/rating counters — computed live from the
  review list instead (see `getReviewAggregate`), documented as a
  revisit point if a provider accumulates hundreds of reviews.
