# Pushkaralu — Architecture Document

Status: Sprint 0 foundation. This document describes the target architecture
that Sprints 1+ build into — not everything here exists as working code yet.

## 1. Audit Summary

No prior repository existed. This is a greenfield Sprint 0 scaffold — there
was no technical debt, duplicated code, or existing security posture to
audit. What follows is the foundation laid down in this sprint plus the
target architecture for everything after it.

## 2. Repository Structure

```
pushkaralu/
├── src/
│   ├── app/                    # Next.js App Router — routes only, thin
│   ├── features/               # Feature-based modules (see §3)
│   │   ├── auth/
│   │   ├── events/
│   │   └── ghats/
│   ├── components/
│   │   ├── ui/                 # Generic, feature-agnostic (Button, Card, Modal)
│   │   └── layout/              # Header, Footer, Nav, Shell
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts       # Client SDK — browser-safe
│   │   │   └── admin.ts        # Admin SDK — server-only, never bundled to client
│   │   └── i18n/                # Dictionary loader + locale dictionaries
│   ├── hooks/                   # Shared React hooks
│   ├── types/                   # Cross-feature types (roles, domain primitives)
│   └── config/                  # Static app config (NOT business data — see §44 of spec)
├── docs/                        # This document + schema/route/role/sprint docs
├── .env.example
└── package.json
```

## 3. Feature-Based Module Pattern

Each business domain (ghats, purohits, hotels, bookings, etc.) gets its own
folder under `src/features/<name>/` containing:

```
features/<name>/
├── types.ts          # Domain types for this feature only
├── api.ts             # Firestore read/write functions (thin wrappers)
├── hooks.ts            # useX() hooks consuming api.ts
├── components/         # Feature-specific UI, not reused elsewhere
└── schemas.ts          # Zod validation schemas (client + server shared)
```

Rules:
- A feature folder never imports from another feature folder directly.
  Shared logic goes in `src/lib` or `src/types`.
- `src/app/**/page.tsx` files stay thin — they compose feature components,
  they don't contain business logic.
- Only `src/features/<name>/api.ts` talks to Firestore for that domain.
  No direct `getFirestore()` calls scattered through components.

Sprint 0 pre-creates empty `auth/`, `events/`, `ghats/` folders as the first
three features (matching the Sprint 1–2 plan) — no logic inside them yet.

## 4. Firebase Architecture

Two entry points, strictly separated:

| File | Runs in | Contains | Bypasses security rules? |
|---|---|---|---|
| `lib/firebase/client.ts` | Browser + Server Components | Public web config (`NEXT_PUBLIC_*`) | No — subject to Firestore rules |
| `lib/firebase/admin.ts` | Server only (Route Handlers, Server Actions) | Service account credentials | Yes — full access, used for role assignment, admin operations |

`admin.ts` imports the `server-only` package so any accidental client import
fails the build immediately rather than leaking credentials at runtime.

**Why this separation matters for this project specifically:** role
assignment (§24) must never be client-writable. The only code path that can
set a Firebase custom claim is a Cloud Function / Route Handler using
`admin.ts`, triggered after an admin action — never a direct client write to
a `role` field.

## 5. Authentication Architecture

- **Provider:** Firebase Auth, phone OTP as primary method (matches the
  target audience — tier 2/3 city users in AP/Telangana more reliably reach
  phone auth than email).
- **Role storage:** Firebase custom claims (`request.auth.token.role`), set
  server-side only. A denormalized `role` field is also written to the
  user's Firestore document for display/query convenience, but it is
  **read-only from the client's perspective** — Firestore rules must ignore
  this field for authorization and only trust the custom claim.
- **New user default role:** `USER`. Provider roles (`PUROHIT`,
  `HOTEL_OWNER`, etc.) are granted only after admin approval of a business
  registration (Module 20), never self-assigned.

## 6. SEO Architecture

- Next.js chosen specifically for SSR/SSG capability (App Router).
- Static content (ghat pages, temple pages) → generated at build time or via
  ISR (Incremental Static Regeneration) with a revalidate window tied to how
  often admins actually change that content.
- Dynamic/personalized content (bookings, profile) → client-rendered, no SEO
  requirement.
- `src/lib/i18n` provides the dictionary layer; each locale's dictionary
  must satisfy the same `Dictionary` interface (enforced by TypeScript), so
  Telugu pages can never silently fall back to missing strings.
- Per-page SEO metadata (title, description, canonical, OG) is modeled in
  `SeoMetadata` (see `src/types/domain.ts`) and will be stored alongside
  each entity in Firestore (e.g. `events/{id}.seo`), not hardcoded in
  components — this is what makes the `/godavari-pushkaralu-2027-*` landing
  page family (spec §26) generatable from data rather than hand-built pages.

## 7. Mobile/Web Sharing Strategy

- Types (`src/types/`) and validation schemas are the primary shared layer —
  designed to be extractable into a shared package (e.g. `packages/shared`
  in a future monorepo split) once the React Native app starts in Sprint 7.
- Firestore data access patterns (`features/<name>/api.ts`) use the Firebase
  JS SDK, which works identically in React Native — the same `api.ts`
  functions are intended to be reused, not reimplemented, in the mobile app.
- UI components are NOT shared (web uses Tailwind/DOM, mobile uses React
  Native primitives) — only logic and types cross the boundary.

## 8. What Sprint 0 Deliberately Does NOT Include

Per your instruction not to implement Phase 1 business features:
- No Ghat/Temple/Hotel/Purohit CRUD or UI
- No real Firebase project connected (env vars are placeholders — you'll
  need to create the Firebase project and fill `.env.local` yourself)
- No Firestore Security Rules file yet (requires the schema in
  `DATABASE_SCHEMA.md` to be reviewed/approved first — rules should not be
  written against a schema that might still change)
- No deployed hosting target
- No mobile app scaffold (Sprint 7 per the dependency map)

These are correctly sequenced into later sprints, not omissions.
