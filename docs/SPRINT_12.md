# Sprint 12: Production readiness (security, performance, SEO, Android, environments)

No new product features. Stability, safety and release preparation only.
Companion documents: `SECURITY_AUDIT.md`, `PERFORMANCE_SEO_AUDIT.md`, `ENVIRONMENTS.md`, `ACCEPTANCE_TESTS.md`, and in the mobile repo `docs/ANDROID_RELEASE.md`.

## Critical issues found and fixed
| # | Area | Problem | Fix |
|---|---|---|---|
| 1 | Firestore rules | Any signed-in user could create a hotel/purohit/business/boat operator directly with `approvalStatus: VERIFIED` (self-approval) | Create allowed only as `PENDING` with own owner id; all creation actually goes through the API |
| 2 | Firestore rules | Provider owners could edit their own `approvalStatus`, `ownerId`, `featured`, etc. | Owners can no longer touch protected fields |
| 3 | Firestore rules | Family-group members could rewrite the group (membership, etc.) and location docs directly | Group + location writes are server-only |
| 4 | Firestore rules | Client could create reviews, leads, Lost & Found reports directly (bypassing validation/moderation) | Server-only; support-ticket read rule bug fixed |
| 5 | Pages | Footer links `/about /contact /terms /privacy /refund-policy` were 404 (caught by the SEO catch-all) | Real pages created (Play Store needs a privacy policy URL) |
| 6 | Play policy | No way to delete an account | `DELETE /api/auth/account`, web Profile button, app Profile button, public `/delete-account` page |
| 7 | Performance/SEO | The Telugu switch (earlier sprint) read cookies in the root layout, which made every page render per request and disabled caching/ISR | Server always renders English; saved language applied after load. Home now served with CDN cache headers |
| 8 | Abuse | No rate limits on booking/lead/review/listing creation | Per-user limits (`src/lib/apiRateLimit.ts`) |
| 9 | Hardening | No security headers | nosniff, frame-ancestors, referrer policy, permissions policy, HSTS, no `X-Powered-By` |
| 10 | AI | Groq retired Llama 3.x (16 Aug 2026) | Default model `openai/gpt-oss-120b` with automatic fallback (earlier sprint, re-verified) |

## Known limits (honest list)
- Firestore rules tests (`npm run test:rules`) need the Firebase emulator, which cannot run in the build sandbox. New rule tests are written but **must be run on your machine** (see ACCEPTANCE_TESTS.md).
- Storage rules are in the repo but cannot be deployed without the Blaze plan; image upload from the admin UI therefore needs Blaze. Everything else works without it.
- The 20 acceptance journeys that depend on your live Firebase / Groq / Razorpay / FCM accounts could not be executed here; each has an exact manual test in ACCEPTANCE_TESTS.md.
- The privacy policy, terms and refund texts are sensible defaults for this app's real data practices but are NOT legal advice: have them reviewed before launch, and set `NEXT_PUBLIC_CONTACT_EMAIL`.
- Push notifications on mobile are optional and off in Expo Go; FCM for the Android app needs `google-services.json` (see ANDROID_RELEASE.md).
