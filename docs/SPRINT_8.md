# Sprint 8 — Live Updates, Notifications & Crowd Management

## Honesty rule: crowd data is manual
Nothing in this platform measures crowds. Every crowd figure is typed in by staff, and the UI says so:
- Public pages show the level, **how long ago and when (IST)** it was updated, a "May be outdated" flag after `MANUAL_STATUS_STALE_HOURS` (6 h), and the line "Entered manually by event staff — not an automatic or live sensor reading". The word "live" no longer appears next to crowd data (home page and ghat list copy changed).
- A ghat nobody has reported on shows **"Crowd not reported"** — the stored placeholder `LOW` (set when a ghat is created) is never displayed as a real level. Wait time is never shown as 0 when unknown, and "open" is never assumed (`UNKNOWN` until staff say OPEN/CLOSED).

## Crowd management
- Levels: LOW / MODERATE / HIGH / CRITICAL. Staff (MODERATOR, ADMIN, SUPER_ADMIN) post an update from **Admin → Events → Ghats → Edit**: level, waiting time (minutes, optional), Open/Closed, alternative ghat (same event, must be published), short note.
- `features/ghats/crowdService.ts` holds the rules (auth, validation, audit); the reporter and timestamp always come from the session/server, never the body. Omitted optional fields are unchanged, `null` clears.
- The ghat page shows the alternative ghat only if it still exists and is published.
- Fixed while here: ghat list cards linked to `/ghats/{id}` (404); they now link to `/events/{eventId}/ghats/{id}`.

## Notifications
Categories: booking, event reminder, emergency, crowd, marketing. Channels: in-app inbox (always) + push (FCM web push).

| Trigger | How |
|---|---|
| Booking | System, from real booking changes (create, status change, payment captured/failed, refund). Idempotent per (booking, change); you aren't notified of your own action. |
| Event reminder | Scheduler: once per event, when it is within 24 h of starting, to people who follow the event. |
| Crowd alert | When staff report HIGH/CRITICAL (rising) or close a ghat: to followers of that ghat. 30-min cooldown per ghat+level. Text is built only from what staff entered and says "Reported manually". |
| Emergency | Admin-written only, via the composer. Never auto-generated. |
| Marketing | Admin-only, only to users who opted in. |

### Preferences
Per category: inbox and push toggles. Defaults: all on except promotions (opt-in). Booking and emergency inbox copies can't be turned off (push can). Push can't be on while the inbox copy is off. Crowd alerts / reminders reach only followed ghats/events (follow buttons on event and ghat pages). Push needs an explicit click on **/notifications/preferences** (browser permission is never requested on load).

### Composer (Admin → Notifications → New)
Title, message, type, priority, audience (followers of event/ghat, everyone, roles, one user), event, location (ghat), schedule, push on/off. Rules enforced server-side:
- ADMIN/SUPER_ADMIN: emergency, crowd, reminder, promotions. MODERATOR: emergency, crowd, reminder (not promotions). Others: nothing.
- Emergency needs explicit confirmation and High/Urgent priority; promotions can't be High/Urgent. Booking can't be composed.
- Links are derived from the chosen event/ghat; free-text links are not accepted.
- 20 campaigns per account per hour. All creates/cancels are audited.

### Delivery & tracking
Each campaign records: targeted, delivered to inbox, skipped by preference, push attempted / accepted / failed, no-push-device, and **opened** (users marking read). Each inbox item stores its push outcome. **"Push accepted" means FCM accepted the message; FCM does not tell the server whether a device displayed it.** Dead tokens (unregistered) are removed automatically.

Delivery is batched (200 recipients), lease-protected, resumable and idempotent (inbox id = campaign id): a retry never duplicates. A campaign that errors 3 times becomes FAILED; details stay in server logs.

## Setup required
1. **Env vars** (Vercel/hosting): `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Firebase console → Project settings → Cloud Messaging → Web Push certificates → generate key pair), and `CRON_SECRET` (long random string). Existing Firebase vars are reused. Without the VAPID key the push button explains push isn't configured; the inbox still works.
2. **Scheduler**: call `GET|POST /api/cron/notifications` every 1–5 minutes with header `Authorization: Bearer $CRON_SECRET` (Vercel Cron: add to `vercel.json`:
   `{ "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }] }` — Vercel sends the bearer automatically when `CRON_SECRET` is set; on Hobby plans crons are limited to daily, use Cloud Scheduler or an external pinger instead). Without it, "send now" still works for small audiences, but scheduled sends, large-audience continuation and event reminders won't run.
3. **FCM API** enabled for the Firebase project (Cloud Messaging API (V1)); the existing Admin service account is used.
4. **firestore.rules** — deny client access: `notificationCampaigns`, `notificationInbox` (+ `items`), `notificationPrefs`, `notificationCooldowns`.
5. **Indexes** (collection: fields):
   - notificationCampaigns: `status, scheduledFor`; `status, leaseUntil`; `createdBy, createdAt`; `createdAt desc`
   - notificationInbox/{uid}/items: `createdAt desc` (single field); `read` (single field)
   - notificationInbox items **collection group**: field overrides `campaignId` and `read` with collection-group scope enabled (needed for "opened" counts)
   - notificationPrefs: `followedEventIds` and `followedGhatIds` array-contains (single-field, automatic)
   - users: `role` (single field, automatic)
6. `public/firebase-messaging-sw.js` must be served from the site root (it is, via `public/`).

## Tests
`features/notifications/service.test.ts` (auth, inbox isolation, preferences & locks, composer authorization/validation, audience targeting, push outcomes & dead-token pruning, batching/resume/lease/idempotency, scheduling, cancel, failure cap, booking idempotency, reminders, crowd alerts & cooldown), `bookingMessages.test.ts`, `features/ghats/crowd.test.ts` (crowd rules, auth, validation, alternative ghat, audit, alert hook isolation). The old mock-based crowd route test was replaced by service tests; the booking-status and Razorpay route tests now mock the notification hook.

## Known limits
No SMS/email/WhatsApp (web push + inbox only; no native mobile token flow beyond the `platform` field); messages are single-language (English); no per-user quiet hours; the inbox updates by polling every 60 s (push covers the "closed tab" case); "delivered to device" can't be reported (FCM limitation); no abuse/unsubscribe link inside push (use preferences page); event reminders only reach followers; no retention job for old inbox items; no A/B or analytics beyond the counters above.
