# Pushkaralu — Database Schema (Firestore)

Status: Design document for Sprints 1+. Only `events` is targeted for
Sprint 1; the rest is documented now so later sprints don't require
re-architecting collections that already have data in them.

## Design Principle

Event-centric root, provider-agnostic leaves:
- Truly **event-scoped** entities (ghats, crowd status, event schedules)
  live as subcollections under `events/{eventId}` — they don't make sense
  outside an event.
- **Provider/business entities** (hotels, purohits, boats, restaurants,
  businesses) are top-level collections, NOT nested under an event, because
  the same purohit or hotel serves multiple Pushkaralu events across years.
  They carry an `availableForEvents: string[]` array instead.

This avoids the two failure modes of a single design: (a) nesting
everything under events would force duplicating a hotel's profile every
year, and (b) flattening everything to top-level would lose the natural
"which ghats belong to this event" grouping and complicate rules.

## Collections

### `events/{eventId}`
Root entity. See `src/types/domain.ts` → `PushkaraluEvent`.
```
name: LocalizedText
river: "GODAVARI" | "KRISHNA" | "TUNGABHADRA" | "OTHER"
year: number
startDate, endDate: ISO string
description: LocalizedText
status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
seo: SeoMetadata
createdAt, updatedAt: ISO string
```
Subcollections:
- `events/{eventId}/ghats/{ghatId}` — event-scoped, includes live
  `crowdStatus`, `lastUpdatedAt`, `lastUpdatedBy` (admin uid, for audit)
- `events/{eventId}/schedules/{scheduleId}` — ritual/event calendar entries
  specific to this event's dates

### `users/{uid}`
```
displayName, phone, email (optional)
role: Role (denormalized copy of custom claim — NOT authoritative, see
       ARCHITECTURE.md §5)
locale: "en" | "te"
createdAt
```

### `ghats` — see `events/{eventId}/ghats/{ghatId}` above (event-scoped).

### `temples/{templeId}`
Event-agnostic. `name, description, history, timings, location (GeoPoint),
images[], facilities[], nearbyAttractions[], seo`.

### `hotels/{hotelId}`
`ownerId (→ users), name, photos[], address, location, contact, amenities[],
priceRange, description, policies, availableForEvents[], approvalStatus`.

### `purohits/{purohitId}`
`userId (→ users), name, photo, languages[], experienceYears, location,
approvalStatus, ritualServices[] (→ rituals), pricing, availability, rating,
reviewCount, contact`.

### `rituals/{ritualId}`
Reference/catalog data: `name, description, typicalDuration, category`.
(Pinda Pradanam, Tarpanam, Homam, etc. — admin-managed catalog, not
per-purohit free text, so search/filtering works.)

### `boats/{boatId}`, `boatOperators/{operatorId}`
Operator profile + boat/route/schedule/pricing, `approvalStatus`.

### `restaurants/{id}`, `parkingLocations/{id}`, `hospitals/{id}`
Directory entities: location, contact, category tags, `verified: boolean`.

### `emergencyContacts/{id}`
Admin-managed only — never user-submitted. `type (police/ambulance/fire/
pharmacy), phone, location, verifiedAt, verifiedBy`.

### `tourismPlaces/{id}`, `packages/{id}`
Content + booking-eligible tourism entities.

### `businesses/{businessId}`
Generic local business (Module 20). `ownerId, name, category, address, gps,
photos[], services[], approvalStatus`.

### `bookings/{bookingId}`
Generic across all bookable provider types (Module 18):
```
userId, providerId, providerType: "HOTEL" | "PUROHIT" | "BOAT" | "TRAVEL" | "PACKAGE"
eventId (nullable — some bookings aren't event-specific)
serviceId, date, time, quantity, amount, commission
status: BookingStatus
paymentStatus, paymentId (→ payments)
createdAt, updatedAt
```

### `payments/{paymentId}`
`bookingId, gateway ("razorpay"), gatewayPaymentId, amount, status,
refundStatus`. Written server-side only (webhook/Cloud Function), never
client-writable.

### `reviews/{reviewId}`
`userId, providerId, providerType, rating, text, moderationStatus,
providerResponse?, createdAt`. One review per (userId, providerId, bookingId)
enforced via document ID composition to prevent duplicate/fraudulent reviews.

### `favorites/{uid}/items/{itemId}`
Per-user subcollection — simple bookmark list.

### `notifications/{uid}/items/{notificationId}`
Per-user subcollection for in-app notification center.

### `announcements/{id}`, `news/{id}`
Admin-managed content, `eventId?` (nullable — some news isn't event-tied),
locale-aware via `LocalizedText` fields, `seo`, `publishAt` for scheduling.

### `lostFoundReports/{id}`
`type ("PERSON"|"CHILD"|"PHONE"|"WALLET"|"DOCUMENT"|"LUGGAGE"), description,
contactPhone, moderationStatus, images[]`. PII fields (contact info) must be
excluded from public reads via security rules — only moderators/admins and
the reporter can read the raw contact info; public view shows a masked
version.

### `familyGroups/{groupId}`
`ownerId, members: [{uid, role}], emergencyContacts[], meetingPoint (GeoPoint)`.
Location-sharing data, if implemented, lives in a separate
`familyGroups/{groupId}/locations/{uid}` subcollection with short TTL —
never merged into the group profile doc, since it changes far more
frequently and shouldn't trigger listeners on the whole group.

### `advertisements/{id}`, `campaigns/{id}`
`advertiser, placement, startDate, endDate, budget, status, clicks,
impressions`. Click/impression counters incremented via Cloud Function, not
direct client writes, to prevent trivial fraud.

### `leads/{id}`
Booking-adjacent inquiries that didn't convert to a full booking (e.g. a
boat inquiry) — kept separate from `bookings` since they have different
lifecycle/reporting needs.

### `supportTickets/{id}`, `auditLogs/{id}`
`auditLogs` is append-only (no update/delete allowed by rules) — records
admin actions (role changes, approval decisions, content edits) with
`actorUid, action, targetRef, timestamp`.

### `settings/{key}`
Single-document-per-key config store for spec §44's admin-configurable
values: commission percentages, booking fees, featured listing prices,
notification templates, category lists, homepage section ordering. Read by
Cloud Functions and server components; writable only by `ADMIN`/`SUPER_ADMIN`.

## Indexing Notes (deferred to relevant sprint)

Composite indexes will be added as each feature's actual query patterns are
implemented — defining them speculatively now would likely not match real
usage. Known likely candidates to revisit:
- `bookings`: `(userId, status, createdAt desc)` and `(providerId, status)`
- `events/{id}/ghats`: `(crowdStatus, lastUpdatedAt desc)`
- `reviews`: `(providerId, moderationStatus, createdAt desc)`

## Explicitly Deferred

Full field-level validation (Zod schemas) is written per-feature at
implementation time (`features/<name>/schemas.ts`), not speculatively here,
so validation logic doesn't drift from the actual forms/APIs built later.
