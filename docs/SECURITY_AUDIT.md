# Security audit (Sprint 12)

Method: read every rule file and every API route handler; scanned the repository for secrets; checked auth, authorization and abuse limits.

## Secrets and keys
- No secrets in git: `.env*` ignored (only `.env.example`); a pattern scan for private keys, `gsk_`, `rzp_live`, `sk_live`, `AIza` found nothing.
- `NEXT_PUBLIC_*` values are public by design (Firebase web config, Razorpay key id). Server-only: `FIREBASE_ADMIN_*`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GROQ_API_KEY`, `CRON_SECRET`, `SUPER_ADMIN_EMAILS`.
- **Action for you:** the earlier-leaked Firebase service-account key must be deleted in Google Cloud > IAM > Service accounts > Keys and replaced. Restrict the browser API key (HTTP referrers: your domain + localhost; APIs: Identity Toolkit, Firestore, FCM only).

## Authentication
- Firebase Auth (email/password, Google). Server session = httpOnly, Secure, SameSite=Lax cookie verified with `verifySessionCookie(..., checkRevoked=true)`. Mobile uses `Authorization: Bearer <ID token>` verified with `verifyIdToken(..., true)`.
- `register-profile` never accepts a role from the client; roles exist only as custom claims set server-side.
- `SUPER_ADMIN_EMAILS` bootstrap requires a **verified** email.

## Authorization (every route checked)
All `src/app/api/**/route.ts` handlers either authenticate (`getServerUser` / `getActor` / `requireRole`), verify a secret/signature (Razorpay webhook HMAC, cron bearer with constant-time compare) or are intentionally public read/beacons (events, ghats, temples, catalog list, search, ads serve, analytics event: the last two are rate limited).
- Admin routes: `requireRole(ADMIN_ROLES)` (or moderator/staff where the matrix says so). Role changes only via `assignRole` (audit-logged); only SUPER_ADMIN can grant ADMIN/SUPER_ADMIN.
- Provider routes: ownership checked against `ownerId`/`userId` server-side; hotel booking price floor enforced.
- Payment state: only the signed webhook can mark PAID.

## Firestore rules (see SPRINT_12.md for the fixes)
Default-deny; role from the custom claim only; `users.role` immutable from clients; audit log append-only and unreadable by non-admins; bookings/payments/notifications server-written. The web app and mobile app perform **no direct Firestore writes**, so rules are now defence-in-depth (everything sensitive is `allow write: if false`).

## Storage rules
Default deny; public read of images only; writes restricted to staff or the listing owner and capped at 8 MB images. Not deployable without Blaze.

## Abuse and transport
Rate limits: assistant (per user/IP), analytics, and new per-user limits on bookings (20/h), leads (20/h), reviews (10/h), listing creation (10/h), account deletion (5/h). Security headers on every response. CSRF: cookie is SameSite=Lax and mutating routes require JSON bodies; Bearer path is not ambient.

## Residual risks / recommendations
1. Add a Content-Security-Policy after testing with Razorpay + Firebase + Maps (report-only first).
2. Enable Firebase App Check for the mobile app and web (reduces scripted abuse of the public API key).
3. Turn on Firebase Auth email enumeration protection and (optionally) email verification before provider registration.
4. Rotate `RAZORPAY_WEBHOOK_SECRET` and keys when staff leave.
