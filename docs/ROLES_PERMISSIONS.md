# Pushkaralu — Role / Permission Matrix

Roles are defined once in `src/types/roles.ts` — this document is the
human-readable explanation of what each role can do; the code file is the
source of truth for the enum itself.

**Enforcement model:** role lives in a Firebase Auth custom claim, set only
by server-side code (`lib/firebase/admin.ts`). Firestore Security Rules
check `request.auth.token.role`. Client-side role checks (this table
applied in UI) are for showing/hiding UI only — they are never the actual
security boundary.

| Capability | USER | PROVIDER* | PUROHIT/HOTEL_OWNER/etc.* | EDITOR | MODERATOR | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|
| Browse public content | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create bookings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit reviews (post-booking) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit lost & found report | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own provider profile | ❌ | ✅ (own only) | ✅ (own only) | ❌ | ❌ | ✅ | ✅ |
| Respond to reviews on own listing | ❌ | ✅ (own only) | ✅ (own only) | ❌ | ❌ | ✅ | ✅ |
| View own booking leads | ❌ | ✅ (own only) | ✅ (own only) | ❌ | ❌ | ✅ | ✅ |
| Create/edit news, blogs, SEO pages | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Moderate reviews / reports / lost&found | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve/reject business registrations | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign/change user roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage events (create/edit/archive) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update ghat crowd status | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage emergency contacts | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage advertisements/campaigns | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage commission/fee settings | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Full platform config (§44 settings) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

`*` PROVIDER_ROLES (`src/types/roles.ts`): `PROVIDER, PUROHIT, HOTEL_OWNER,
TRAVEL_OPERATOR, BOAT_OPERATOR, BUSINESS_OWNER` — all share the same
"manage own listing only" permission shape; they differ only in *which*
collection their listing lives in, not in permission structure.

## Role Lifecycle

1. New sign-up → `USER` (default, set automatically on account creation).
2. `USER` submits business registration (Module 20) → status `PENDING`,
   role unchanged.
3. `ADMIN`/`SUPER_ADMIN` approves → Cloud Function sets custom claim to the
   matching provider role AND updates `approvalStatus` to `VERIFIED`. These
   two writes happen in the same transaction so they can't desync.
4. `SUPER_ADMIN` can promote staff to `EDITOR`/`MODERATOR`/`ADMIN` via the
   same server-side claim-setting path — never a direct Firestore write to
   a role field from any client.

## Open Question for Sprint 3 (Admin Dashboard)

Whether `ADMIN` can create another `ADMIN`, or only `SUPER_ADMIN` can — spec
doesn't specify. Recommend restricting `ADMIN` creation to `SUPER_ADMIN`
only, to avoid privilege-escalation chains. Flagging for your confirmation
before Sprint 3 builds the user-management screen.
