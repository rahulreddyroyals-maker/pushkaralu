# Pushkaralu

Digital pilgrimage, tourism & services platform. Multi-event architecture
(Godavari/Krishna/Tungabhadra Pushkaralu and beyond) — not hardcoded to a
single event.

## Status: Sprint 4 — Hotels, Purohits & Local Services Marketplace

Auth (Sprint 2), the Event/Ghat/Temple platform (Sprint 3), and the full
provider marketplace (Sprint 4 — Hotels, Purohits, Rituals, and a
categorized Businesses directory covering taxis/travel/boats/
restaurants/local businesses/guides) are implemented, including the
provider application → admin approval → role grant pipeline, inquiries,
and reviews. See `docs/MARKETPLACE.md` for the full breakdown.

## Demo data

```bash
npm run seed   # requires .env.local configured against a real Firebase project
```

## Testing

```bash
npm test          # unit tests — guards, schemas, route handler auth logic
npm run test:rules  # Firestore Rules emulator suite — requires local Firebase emulator
```

## Stack

- **Web:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions, FCM) —
  client/admin SDK strictly separated (see `docs/ARCHITECTURE.md`)
- **Mobile (Sprint 7+):** React Native + Expo + TypeScript
- **Payments:** Razorpay, behind a payment-abstraction interface
- **i18n:** English + Telugu, extensible to Hindi/Tamil/Kannada/Malayalam

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase project credentials
npm run dev
```

You'll need to create a Firebase project yourself and populate
`.env.local` — no live Firebase project is connected in this scaffold.

## Documentation

- `docs/ARCHITECTURE.md` — folder structure, Firebase architecture, auth,
  SEO strategy, mobile/web sharing plan
- `docs/AUTHENTICATION.md` — Sprint 2: auth methods, role enforcement,
  what's tested vs. what needs your machine to verify
- `docs/EVENTS_GHATS_TEMPLES.md` — Sprint 3: data model, publish/unpublish,
  crowd status, search/pagination, maps, demo data, mobile
- `docs/MARKETPLACE.md` — Sprint 4: provider approval pipeline, role
  grants, the shared Businesses collection, privacy design
- `docs/DATABASE_SCHEMA.md` — full Firestore collection design
- `docs/DESIGN_SYSTEM.md` — color/type/signature-element rationale
- `docs/ROUTE_MAP.md` — web routes, mobile navigation, admin routes
- `docs/ROLES_PERMISSIONS.md` — role/permission matrix
- `docs/SPRINT_DEPENDENCY_MAP.md` — sprint sequencing and dependencies

## Sprint Discipline

Per project convention, features are built one sprint at a time and
reviewed before the next sprint begins. See
`docs/SPRINT_DEPENDENCY_MAP.md` for the full plan.
