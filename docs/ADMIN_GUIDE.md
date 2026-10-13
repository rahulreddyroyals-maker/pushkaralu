# Admin guide: who can do what, and how to set it up

## Roles
| Role | Purpose | Admin menu |
|---|---|---|
| USER | Pilgrim (default for every sign-up) | no |
| Provider roles (HOTEL_OWNER, PUROHIT, BUSINESS_OWNER...) | A business owner whose application was approved | `/provider` dashboard |
| EDITOR | Writes content (articles, guides, FAQs, location/service pages) | yes |
| MODERATOR | Moderates, updates crowd status | yes |
| ADMIN | Events, ghats, temples, approvals, emergency, ads | yes |
| SUPER_ADMIN | Everything + grants Admin roles + fee/settings | yes |
Only a SUPER_ADMIN can grant ADMIN or SUPER_ADMIN. ADMIN can grant the other roles.

## Step 1: create the FIRST Super Admin (once)
Nobody can grant the first one from the website, so do it from your computer:
1. Register normally at `/register` with your email.
2. In `pushkaralu/.env.local` set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (a NEW service-account key from Firebase console > Project settings > Service accounts; never commit it, delete the key afterwards).
3. Run: `npm run make-super-admin -- you@example.com`
4. Sign out of the website and sign in again (roles are read at sign-in).
5. Open `/admin`.

## Step 2: give other people access
`/admin/users` -> search the person (they must have registered) -> choose role -> Save -> enter a reason (audit log). They sign out and in again.

## Step 3: what each admin area does
- Events, Ghats, Temples, Rituals: create/edit/publish. Crowd/open status is entered manually by staff (never "live").
- Content & SEO (Articles, Pilgrim Guides, FAQs, Location pages, Service pages), Travel & Tourism (Transport, Boats, Parking, Restaurants, Tourism, Itineraries, Packages), Emergency Directory, Advertisers / Campaigns / Placements: all use the same list + "New" form under `/admin/<name>`.
- Hotels, Purohits, Businesses: the approval queues (Verify / Reject).
- Bookings, Revenue, Inquiries, Lost & Found, Notifications, Analytics, Settings (Super Admin: commission/fees).

## Registering businesses
Two ways:
1. Self-service (normal): the owner signs in, opens `/register-business`, picks Hotel / Purohit / a business category and submits the form. It appears under `/admin/hotels`, `/admin/purohits` or `/admin/businesses` as pending; an Admin clicks Verify. The owner then gets the matching provider role and a `/provider` dashboard to manage their listing, bookings and leads.
2. On behalf of someone (Admin): use the same forms while signed in as the owner, or create the record yourself under the relevant admin catalog (Transport, Boats, Restaurants, Parking, Tourism...), which are admin-managed and published directly.

## Checking the AI assistant
`/api/assistant/status` shows its configuration. When signed in as Admin, `/api/assistant/status?probe=1` makes one real test call and tells you exactly what is wrong (bad key, wrong model...).
