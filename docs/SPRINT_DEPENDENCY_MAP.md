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

Sprint 4 — Admin Module Screens (Events, Ghats, etc. wired to real data)
  STATUS: folded into Sprint 3 above — no longer a separate sprint.
  Delivers: the admin shell built in Sprint 1 gets real Event + Ghat
            management screens instead of placeholder stat cards
  Depends on: Sprint 2 (roles), Sprint 3 (ghat data model)
  Blocks: every subsequent admin-managed module (5, 6, 7, 9)

Sprint 5 — Purohit Directory (primary marketplace)
  Delivers: purohit profiles, ritual catalog, public directory + detail
            pages, admin verification screen
  Depends on: Sprint 2 (roles — PUROHIT role), Sprint 4 (admin approval UI)
  Blocks: Sprint 7 (bookings need at least one bookable provider type)

Sprint 6 — Hotels + Business Registration
  Delivers: hotel profiles, generic business registration flow + admin
            approval queue
  Depends on: Sprint 2, Sprint 4
  Independent of Sprint 5 — could be reordered ahead of it

Sprint 7 — Generic Booking Architecture + Reviews
  Delivers: booking creation/status flow across provider types, review
            submission tied to completed bookings
  Depends on: Sprint 5 or 6 (needs at least one real provider type to book)
  Blocks: Sprint 9 (commission/monetization needs bookings to exist)

Sprint 8 — Mobile: Real Feature Screens
  Delivers: mobile Explore/Services/Bookings/Profile tabs replace their
            Sprint 1 placeholders, reusing web's features/<name>/api.ts
  Depends on: Sprint 2 (auth), and whichever web feature sprints have
              shipped by this point
  Can run incrementally alongside web feature sprints rather than as one
  block, since the mobile shell already exists

Sprint 9 — Emergency + Lost & Found + Family Safety
  Delivers: admin-managed emergency contacts, moderated lost&found
            reports, opt-in family location sharing
  Depends on: Sprint 2 (auth), Sprint 4 (moderation queue pattern)
  Independent of the marketplace sprints (5-7)

Sprint 10 — Advertising + Monetization Config
  Delivers: ad placement management, commission/fee settings screen
            (§44 settings collection), click/impression tracking
  Depends on: Sprint 4 (admin shell wired to data), Sprint 7 (bookings
              exist to take commission from)

Sprint 11 — AI Pilgrimage Assistant
  Delivers: tool-grounded assistant that queries live platform data
            (events, ghats, hotels) rather than generating from model
            knowledge alone
  Depends on: Sprints 2-7 (needs real data to be tool-grounded against)
```

## Critical Path

`Sprint 0 → 1 (done) → 2 → 3 → 4 → (5 or 6) → 7 → 10`

Sprints 8, 9, and 11 can be pulled forward or delayed relative to this
spine without breaking dependencies.
