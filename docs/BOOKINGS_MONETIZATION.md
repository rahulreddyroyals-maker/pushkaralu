# Pushkaralu — Booking, Leads & Monetization (Sprint 5)

Status: implemented and verified (build/lint/typecheck/111 tests passing;
auth gating confirmed in a production build).

## Booking architecture

`bookings/{bookingId}` is generic across all three provider types
(hotel / purohit / business) rather than one collection per type —
same reasoning as the shared `businesses` collection in Sprint 4. Every
field the spec listed is present: date, time, quantity, customer,
provider, price, commission, and status.

### Commission is snapshotted, not computed on read

`commissionPercent`, `commissionAmount`, and `providerPayout` are
written onto each booking **at creation time** from
`settings/monetization`, not recalculated whenever the booking is
displayed.

This is deliberate and worth understanding: if an admin raises the
platform commission from 10% to 15% next month, every booking made last
month must keep showing the 10% that was actually agreed. Recomputing
historical bookings against the current rate would silently rewrite
financial history — and providers would see their past payouts change
under them.

### Status transitions are a pure state machine

`features/bookings/statusMachine.ts` holds every legal transition as
data, keyed by `(currentStatus, nextStatus) → allowed actors`. It has no
Firebase dependency, so it's directly unit tested (13 tests) rather than
only exercised through mocked route handlers.

The route (`/api/bookings/[id]/status`) applies **two independent
checks**:
1. *Who is this caller relative to this booking?* — derived from the
   booking's own `userId` / `providerOwnerId` fields, never from
   anything the client sends.
2. *Is that actor allowed to make this specific transition?* — delegated
   to the state machine.

Notable rules this encodes: a customer can cancel but **cannot confirm**
their own booking; `REFUNDED` is admin-only from every state (it's the
one transition implying real money moving back); and terminal states
(`CANCELLED`, `REFUNDED`) can't be revived by anyone, including admins.

## Payment architecture

`lib/payments/types.ts` defines a `PaymentProvider` interface; the rest
of the app depends on that, not on Razorpay's API shape. Swapping
gateways later means writing one new file, not touching call sites.

`lib/payments/razorpay.ts` implements it against Razorpay's REST API via
plain `fetch` rather than their Node SDK — a deliberate call given the
`firebase-admin`/gRPC bundling failure this project already hit on
Vercel. Two endpoints (create order, verify signature) isn't enough
surface to justify another dependency with its own bundling quirks.

**Secrets**: `RAZORPAY_KEY_SECRET` and the new
`RAZORPAY_WEBHOOK_SECRET` are server-only (no `NEXT_PUBLIC_` prefix, so
they cannot reach the browser bundle). The only payment value the client
ever receives is `NEXT_PUBLIC_RAZORPAY_KEY_ID`, which is exactly what
Razorpay's checkout widget needs.

### Webhook design

`/api/webhooks/razorpay` is public — Razorpay's servers call it, not a
signed-in user — so **the signature check is the authentication**.
Specifics that matter:

- Reads the **raw body text before parsing**. The HMAC is computed over
  the exact bytes Razorpay sent; re-serializing a parsed object produces
  a different string and fails verification for reasons that are
  miserable to debug.
- Uses `crypto.timingSafeEqual`, not `===` — a plain string comparison
  on an HMAC is a textbook timing-attack vector.
- **Fails closed**: if `RAZORPAY_WEBHOOK_SECRET` isn't configured, every
  webhook is rejected rather than waved through. Specifically tested.
- **Idempotent**: webhooks get retried and can arrive out of order, so a
  repeat `payment.captured` on an already-`PAID` booking is a no-op
  success, and a late capture on a `CANCELLED` booking updates payment
  status without reviving the booking.
- Acknowledges (200) unknown orders and unhandled event types rather
  than 404ing, so Razorpay stops retrying things that were never ours.

The client-side checkout `handler` callback deliberately does **not**
mark the booking paid — it only navigates. A client callback can be
faked; the signed webhook is the source of truth.

## Monetization — nothing hardcoded

`settings/monetization` (a single Firestore doc, SUPER_ADMIN-write-only,
matching `match /settings/{key}` in firestore.rules) holds booking
commission %, lead fee, featured listing price, and sponsored listing
price. Every consumer reads via `getMonetizationSettings()`.

There is exactly one constant, `DEFAULT_MONETIZATION_SETTINGS`, used
only as a bootstrap when the document doesn't exist yet (brand-new
project, before an admin has saved settings once). It's documented as
such in place, rather than being a magic number sitting inside
commission logic.

`/admin/settings` renders read-only for non-SUPER_ADMIN staff instead of
hiding entirely — other staff read reports that depend on these rates,
so seeing them is useful; the server enforces the write restriction
independently.

## Admin reporting

`/admin/revenue` covers three of the four admin deliverables (revenue
dashboard, commission report, provider report) on one page — they're
three views of the same booking data, and splitting them across routes
would mean three near-identical aggregation passes. `/admin/bookings` is
the fourth, with status filtering.

Revenue figures count **only CONFIRMED and COMPLETED** bookings —
PENDING hasn't been accepted, CANCELLED/REFUNDED reversed it. Stated on
the page itself so the numbers aren't silently ambiguous.

## Bug found and fixed in existing code

Sprint 2's forward-looking Firestore rule for `bookings` compared
`resource.data.providerId == request.auth.uid` — but `providerId` is the
**listing's** id, not a user id, so that clause could never match.
Providers would have been unable to read their own bookings. Fixed to
use the denormalized `providerOwnerId` (which is exactly why bookings
carry that field). Bookings rules are now deny-all for direct client
writes, since creation and status changes must flow through the
server-side commission snapshot and state machine.

Also extracted `resolveListingOwnerId` — it had been duplicated across
two lead route files and was about to gain a third copy.

## Leads vs. bookings

Both exist and serve different needs, per the spec's split. Leads
(Sprint 4) are the no-payment path: inquiry, callback request, provider
notification. Bookings (this sprint) are the payment-capable path with
dates, quantities, commission, and status lifecycle. Provider detail
pages now show **both** side by side — a visitor can request a firm
booking or just ask a question.

## Explicitly deferred

- **WhatsApp request** (spec's lead-system bullet): not implemented.
  Would need either a `wa.me` deep link (trivial, but exposes the
  provider's number, which contradicts the Sprint 4 privacy design) or
  the WhatsApp Business API (a real integration with its own approval
  process). Flagged rather than guessed at.
- **Provider notification** on new leads/bookings: no email/push yet —
  providers see inquiries and bookings in their dashboard. Real
  notification delivery belongs with the FCM work in a later sprint.
- **Featured/sponsored listing purchase flow**: prices are configurable
  and stored, but there's no provider-facing "feature my listing"
  checkout or a `featured` flag influencing listing order yet. The
  advertisement module (spec Module 21) is its own sprint.
- **Payments collection**: `bookings` carries `paymentOrderId`/
  `paymentId` inline; a separate `payments/{id}` ledger (already scoped
  in firestore.rules) isn't populated yet. Worth adding when refunds and
  settlement reconciliation become real.
- **Firestore rules emulator tests** for the new booking rules — same
  environment limitation as Sprints 2-4 (this sandbox can't download
  Google's emulator). Run `npm run test:rules` locally.
