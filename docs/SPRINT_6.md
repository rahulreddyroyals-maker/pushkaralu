# Sprint 6 — Travel, Boats, Parking, Food & Tourism

All data is **admin-managed** and served through one reusable catalog layer.

## Architecture
- `src/lib/catalog/types.ts` — `CatalogDefinition` (schema + form fields + filter/private/stamp/dependent rules).
- `src/lib/catalog/server/repository.ts` — list (cursor pagination, prefix search, whitelisted filters), get, getMany, create (always draft), update (full replace, server-owned fields kept), publish, delete (blocked while referenced).
- `src/lib/catalog/server/handlers.ts` — admin POST/PATCH/DELETE/publish + public GET; ADMIN_ROLES only, audit-logged, zod re-validated server-side.
- `src/features/catalog/registry.ts` — the list of catalogs. **Add a catalog = write a definition + register it**; admin pages (`/admin/{key}`), APIs (`/api/admin/catalog/{key}`, `/api/catalog/{key}`) and list UI follow.
- Catalogs: transport, boat-operators, boats, boat-routes (schedules, duration, pricing, safety), parking, restaurants, tourism (destinations + temple tourism), itineraries (one-day/multi-day), packages.

## Honesty rules implemented
- Operator phones are `privateFields`: stripped from every public read; visitors use inquiries (leads `transport`, `boat_route`, `travel_package` → Admin > Inquiries).
- Parking/boat status is manual: server stamps `statusUpdatedAt` on change; pages show "updated X ago" and "may be outdated" after `MANUAL_STATUS_STALE_HOURS`.
- Restaurant open/closed is computed from hours in IST (not a stored flag); unknown hours show no badge.
- Missing price renders "Price on request", never 0. Boat routes require safety information.

## Firestore composite indexes needed (collection: fields)
All public lists: `published ASC, createdAt DESC`, plus per filter:
- transportServices: `kind, published, createdAt`
- boats: `operatorId|boatType, published, createdAt`
- boatRoutes: `active|operatorId, published, createdAt`
- parkingLocations: `status|parkingType, published, createdAt`
- restaurants: `dietType|priceCategory|familyFriendly, published, createdAt`
- tourismPlaces: `kind, published, createdAt`; itineraries: `tripType, published, createdAt`; travelPackages: `itineraryId, published, createdAt`
- Search: `published, nameLower` (+ the filter field) per collection.
- leads: `providerType (in), createdAt DESC`.

## firestore.rules / storage.rules (files were not in the provided zip — merge manually)
All reads go through the Admin SDK API routes, so client access can stay closed:
```
match /{col}/{id} { allow read, write: if false; }   // for each collection below
// transportServices boatOperators boats boatRoutes parkingLocations restaurants tourismPlaces itineraries travelPackages
```
Storage: allow staff write to `images/{transport|boat-operators|boats|boat-routes|parking|restaurants|tourism|itineraries|packages}/**` (same rule shape as existing `images/temples/**`).

## Not in this sprint
Bookings/payments for catalog items (booking requires an owner account; these are inquiry-only), seed/demo data, sitemap entries, Telugu list/detail locale switching (content is stored bilingual; pages render English via `pick()`).
