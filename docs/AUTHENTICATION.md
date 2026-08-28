# Pushkaralu — Authentication & Authorization (Sprint 2)

Status: implemented and verified (build/lint/typecheck/unit tests all
passing). This documents what was actually built, how it enforces
authorization, and what is explicitly deferred.

## Three layers of enforcement

Authorization is checked in three places, each independently capable of
denying access — not just for redundancy, but because each layer protects
a different attack surface:

| Layer | Protects against | Can be bypassed by |
|---|---|---|
| `src/proxy.ts` (edge) | Obviously logged-out visitors hitting `/admin`, `/profile` | A forged cookie — this layer only checks *presence*, never validity |
| `getServerUser()` (`src/lib/auth/session.ts`) | Forged/expired/revoked cookies, direct URL access to protected pages | Nothing from the browser — this verifies the cookie's cryptographic signature against Firebase on every request |
| `firestore.rules` | Any direct client SDK read/write to Firestore, regardless of which UI (or lack of UI) made the call | Nothing — this is Firebase's own enforcement, independent of our application code |

This was verified concretely, not just asserted: a request with a forged
`__session` cookie value passed the proxy (cookie was present) but was
correctly rejected by `getServerUser()` and redirected — see the test
transcript in this sprint's delivery notes.

## Role source of truth

A user's role lives **only** in a Firebase Auth custom claim, set by:
- `POST /api/auth/register-profile` — sets `role: USER` once, at account creation, and only that role
- `POST /api/admin/users/[uid]/role` — the only path that can ever change a role afterward, gated by `canAssignRole()` (blocks `ADMIN` from minting more `ADMIN`/`SUPER_ADMIN`, per the privilege-escalation decision recorded in `docs/ROLES_PERMISSIONS.md`)

The `users/{uid}.role` Firestore field is a denormalized copy for
display/query only. `firestore.rules` explicitly blocks any client —
including an authenticated `ADMIN` — from writing that field directly,
so a role change is always audit-logged; there is no back door.

## What was built

**Auth methods:** email/password, Google (popup), phone (OTP via
invisible reCAPTCHA) — all three, per this sprint's requirement.

**Pages:** `/register`, `/login` (with an Email/Phone tab switch),
`/forgot-password`, `/profile` (protected, shows role badge, edit
display name/locale, sign out).

**Session handling:** client Firebase Auth state is mirrored into an
httpOnly session cookie (`__session`) via `POST /api/auth/session`,
refreshed on every ID token change (including role changes, which take
effect on next token refresh — `refreshIdToken()` in `client.ts` forces
this after an admin changes someone's role).

**Audit logging:** `src/lib/audit/log.ts` — append-only, written by every
sensitive Route Handler. `firestore.rules` denies ALL client writes to
`auditLogs`, including from `SUPER_ADMIN` — an editable audit trail isn't
an audit trail.

**Role-based UI:** `<RoleGate allow={[...]}>` (`src/components/auth/RoleGate.tsx`)
hides/shows elements like the Header's Admin link. Explicitly documented
in the component itself as **not** a security boundary — assume any
gated UI can be bypassed and the underlying route/API is what actually
protects the data.

## Testing — what ran here vs. what needs your machine

**Ran and passing in this environment (46/46 tests, `npm test`):**
- `src/lib/auth/guards.test.ts` — 24 tests on pure authorization logic (privilege escalation, cross-tenant access, unauthenticated denial)
- `src/features/auth/schemas.test.ts` — 14 tests on input validation (rejects injected role strings, weak passwords, malformed input)
- `src/app/api/admin/users/[uid]/role/route.test.ts` — 8 tests against the **actual role-assignment endpoint** with the Admin SDK mocked: unauthenticated → 401, malformed body → 400, unauthorized role → 403, missing target → 404, authorized change → 200 + audit log written

**Written but NOT executed here (`npm run test:rules`):**
- `src/__tests__/firestore.rules.test.ts` — full Firestore Rules emulator suite covering the same scenarios (role field immutability, cross-owner listing denial, audit log write denial for all roles including SUPER_ADMIN). The Firestore emulator binary downloads from Google Cloud Storage, which this build environment's network policy blocks (confirmed 403). Run with:
  ```
  firebase emulators:exec --only firestore "npm run test:rules"
  ```
  on a machine with normal internet access, before trusting `firestore.rules` in production.

## Explicitly deferred

- Role-assignment **UI** (an admin screen to call `/api/admin/users/[uid]/role`) — the API exists and is tested; the admin dashboard screen to drive it lands with the Users module sprint.
- Email verification enforcement (Firebase sends the email; nothing currently gates unverified accounts).
- Rate limiting on auth endpoints (spec §24 mentions "where appropriate" — worth revisiting before production launch).
- Mobile app authentication — this sprint was scoped to Firebase/Auth/Roles for the web app; mobile auth screens can follow the same client.ts pattern once prioritized.
