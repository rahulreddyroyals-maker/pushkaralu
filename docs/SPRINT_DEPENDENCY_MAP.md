# Pushkaralu — Sprint Dependency Map

Each sprint lists what it depends on and what depends on it. Sprints are
independently reviewed per spec §48 — nothing here should be built ahead of
its sprint being explicitly requested.

```
Sprint 0 — Foundation (THIS SPRINT)
  Delivers: repo scaffold, Firebase client/admin split, i18n framework,
            role types, config layer, docs
  Depends on: nothing
  Blocks: everything below

Sprint 1 — Design System & Application Shell (COMPLETE)
  Delivers: web design tokens + 14 reusable UI components, responsive
            Header/Footer/SiteShell + homepage shell, admin dashboard
            shell (sidebar/topnav), AND the mobile app shell (bottom tabs,
            reusable Header/Card/LoadingState) — pulled forward from the
            original Sprint 7 slot at explicit request, since it's design
            system work, not a business feature
  Depends on: Sprint 0
  Blocks: nothing structurally — but real screens in any module now have
          a shell to be built into
  Note: Auth + Roles + Event Model (the original Sprint 1 proposal) is
        renumbered below and still needs to happen before any real data
        flows through these shells.

Sprint 2 — Auth + Roles + Event Model (COMPLETE)
  Delivered: email/password + Google + phone auth, custom-claim role
             assignment via an audited API route (not a Cloud Function —
             see docs/AUTHENTICATION.md), full Firestore rules, admin
             route guard now real (src/app/admin/layout.tsx)
  Depends on: Sprint 0 (Firebase setup, role types)
  Blocks: nothing remaining — unblocked Sprint 3

Sprint 3 — Event + Ghat + Temple Platform (COMPLETE, expanded scope)
  Delivered: full Event/Ghat/Temple data layer + admin CRUD (create,
             edit, publish/unpublish, delete, image management), public
             pages with search/filter/pagination, crowd status with
             honest "updated X ago" UI, map component (graceful fallback
             without a Maps API key), demo data seed script, mobile
             Explore tab wired to real Firestore data
  Depends on: Sprint 2 (events exist to scope ghats under, roles exist
              for admin gating)
  Note: originally scoped as "Ghat Directory + Crowd Management" only;
        expanded at explicit request to include Events and Temples too,
        plus admin CRUD and mobile — see docs/ROUTE_MAP.md for the
        resulting route structure (nested /events/{id}/ghats/... instead
        of the originally-planned flat /ghats)
  Blocks: nothing remaining for the entities it covers — Hotels/Purohits/
          Businesses (Sprint 5/6 below) follow the same admin CRUD
          pattern established here

Sprint 4 — Hotels, Purohits & Local Services Marketplace (COMPLETE, expanded scope)
  Delivered: full data layer for Hotels, Purohits, Rituals (admin
             catalog), and a generic categorized Businesses collection
             (taxis/travel operators/boats/restaurants/local businesses/
             guides — one collection, not six, see
             features/businesses/types.ts). Search/filter/pagination on
             every public listing page. Leads (inquiry mechanism) and
             Reviews. Full provider-application → admin-approval →
             role-grant pipeline via a shared assignRole() function.
             Provider dashboard (create/edit own listing, view
             inquiries). Admin approval queues for all three provider
             types plus full rituals CRUD.
  Depends on: Sprint 2 (roles — PROVIDER_ROLES, canManageOwnListing),
              Sprint 3 (admin shell, ImageUploader, EntityActions pattern)
  Blocks: Sprint 7 (bookings need at least one bookable provider type —
          now satisfied)
  Note: originally scoped as three separate sprints (5: Purohit
        Directory, 6: Hotels + Business Registration) — delivered
        together since they share the same approval/role-grant
        machinery and splitting them would have meant building that
        machinery three times. See docs/MARKETPLACE.md for the full
        breakdown.

Sprint 7 — Generic Booking Architecture + Reviews
  STATUS: Reviews delivered early as part of Sprint 4 (see above) —
          Leads/inquiries serve as the interim "booking request"
          mechanism spec Module 4 calls for, ahead of a real Booking
          module with payment/status tracking.
  Delivers: booking creation/status flow across provider types
  Depends on: Sprint 4 (needs at least one real provider type to book —
              now satisfied by Hotels/Purohits/Businesses)
  Blocks: Sprint 9 (commission/monetization needs bookings to exist)

Sprint 8 — Mobile: Real Feature Screens
  Delivers: mobile Explore/Services/Bookings/Profile tabs replace their
            Sprint 1 placeholders, reusing web's features/<name>/api.ts
  Depends on: Sprint 2 (auth), and whichever web feature sprints have
              shipped by this point (Events/Ghats/Temples done, now
              Hotels/Purohits/Businesses/Rituals too)
  Can run incrementally alongside web feature sprints rather than as one
  block, since the mobile shell already exists

Sprint 9 — Emergency + Lost & Found + Family Safety
  Delivers: admin-managed emergency contacts, moderated lost&found
            reports, opt-in family location sharing
  Depends on: Sprint 2 (auth), Sprint 3 (moderation queue pattern)
  Independent of the marketplace sprints

Sprint 10 — Advertising + Monetization Config
  Delivers: ad placement management, commission/fee settings screen
            (§44 settings collection), click/impression tracking
  Depends on: Sprint 3 (admin shell wired to data), Sprint 7 (bookings
              exist to take commission from)

Sprint 11 — AI Pilgrimage Assistant
  Delivers: tool-grounded assistant that queries live platform data
            (events, ghats, hotels) rather than generating from model
            knowledge alone
  Depends on: Sprints 2-4 (needs real data to be tool-grounded against —
              now satisfied)
```

## Critical Path

`Sprint 0 → 1 (done) → 2 (done) → 3 (done) → 4 (done) → 7 → 10`

Sprints 8, 9, and 11 can be pulled forward or delayed relative to this
spine without breaking dependencies.
