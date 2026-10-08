# Sprint 7 — Safety, Emergency, Lost & Found & Family

## Design
Authorization and privacy live in **framework-free services** (`features/{lostFound,family}/service.ts`) behind a store port. Route handlers only translate a `ServiceResult` to HTTP; Firestore adapters (`store.ts`) are `server-only`. Tests run the real services against in-memory stores.

### Emergency (`/emergency`, `/admin/emergency`, `/admin/emergency-services`)
- A catalog (`emergency-services`) on the Sprint 6 registry: police, ambulance, fire, hospital, pharmacy, first aid. **No numbers are hardcoded** — everything is admin-entered.
- `verifiedOn` (not in the future) and `verificationSource` are mandatory. Entries older than `SAFETY_LIMITS.emergencyReverifyDays` show a "re-verify" warning. Empty categories show "No verified … information has been published yet".
- One-tap `tel:` calling; navigation via a Google Maps directions link (no API key). "Nearest to me" is computed in the browser; the user's position is never sent to the server.
- Admin dashboard: counts per kind (published/draft/stale), pending Lost & Found, escalated family alerts with acknowledge.

### Lost & Found (`/lost-and-found`, `/admin/lost-and-found`)
- Categories: person, child, phone, wallet, document, luggage. Reports are **always PENDING** and private to the reporter + moderators.
- A moderator writes the public title/summary/area at approval; these are scanned for emails, links and long digit runs. The reporter's own text, phone, subject name and age are never published (explicit whitelist `toPublicView`).
- State machine: PENDING→APPROVED/REJECTED, APPROVED→REJECTED (takedown, reason required), PENDING/APPROVED→RESOLVED. Invalid transitions → 409. All decisions audited.
- Non-owners get **404** (not 403) for private reports. "I may have found this" responses: approved reports only, not your own, max 3 per responder, visible only to the reporter and moderators. 5 reports/day per user.
- Roles: `canModerateContent` = ADMIN, SUPER_ADMIN, MODERATOR (EDITOR cannot moderate).

### Family groups (`/family`)
- Create, invite by 8-character code (48 h expiry), emergency contact, meeting point, alerts.
- **Location sharing is opt-in**: off by default and after joining; enabling needs `consent: true` and a duration ≤ 24 h; it expires on its own; others see a location only while the window is open; disabling, expiry, leaving or removal erases the stored fix. Updates are sent only while the page is open (web geolocation).
- Alerts: group-only by default. Location is attached only if the sender ticks "include my location" for that alert. "Notify staff" is a separate opt-in that needs a callback phone; staff see only those alerts (no group, roster or locations).
- Non-members (including moderators/admins) get 404 for every group operation; invalid and expired codes give identical errors.

## Firestore (rules files were not in the zip — merge manually)
All access goes through Admin-SDK API routes. Deny client access to:
```
match /{col}/{id} { allow read, write: if false; }
// emergencyServices lostFoundReports lostFoundResponses familyGroups (+ members subcollection) familyInvites familyAlerts
```
Storage: allow staff write to `images/emergency/**`.

### Composite indexes
- lostFoundReports: `status, category, reportType, createdAt desc`; `status, createdAt asc`; `reporterId, createdAt`
- lostFoundResponses: `reportId, responderId`; `reportId, createdAt desc`
- familyGroups: `memberIds array-contains`
- familyAlerts: `groupId, status, createdAt desc`; `senderId, createdAt`; `escalated, status, createdAt desc`
- emergencyServices: `kind, published, createdAt`

## Tests (`tsx --test`)
`features/lostFound/service.test.ts`, `features/family/service.test.ts`, `features/emergency/definition.test.ts`, `lib/safety/safety.test.ts`, updated `features/catalog/definitions.test.ts` — covering unauthenticated access, 404-vs-403 behaviour, PII whitelisting, consent, expiry, erasure, caps, rate limits, staff scoping and audit.

## Known limits / not in this sprint
No push/SMS notifications (alerts are seen by polling every 30 s); location updates need the page open; no invite brute-force throttling beyond code entropy; no abuse-report flow for public listings; no data-retention job for old reports/alerts; no seeded emergency data (by design).
