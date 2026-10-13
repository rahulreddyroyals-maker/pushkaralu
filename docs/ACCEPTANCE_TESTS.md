# Final acceptance tests (Sprint 12)

Legend: **A** = covered by automated tests that pass in the build (533 tests) | **B** = verified on a production build locally | **L** = needs your live accounts: follow the manual steps, tick the box.
Honest status: nothing below marked L was executed by me, because the build sandbox cannot reach your Firebase, Groq, Razorpay or FCM accounts.

Before testing: deploy v-latest, Firebase Email/Password enabled, `NEXT_PUBLIC_SITE_URL` set, rules+indexes deployed, demo data seeded in STAGING (`npm run seed`).

| # | Test | Level | Manual steps / expected result | Pass |
|---|---|---|---|---|
| 1 | New user registration | L (+A schemas) | /register: create account. Expect redirect home, header shows your name. Firestore `users/{uid}` exists with `role: USER`. Wrong/weak password shows a clear message. | [ ] |
| 2 | Login | L | Sign out, sign in with email, then with Google. Mobile: same account signs in. | [ ] |
| 3 | Browse event | L | /events lists published events; open one: dates + hub page. | [ ] |
| 4 | Browse ghat | L | /ghats (redirects to the event's ghats if one event). Detail shows facilities and crowd status marked **manual + time updated**. | [ ] |
| 5 | Browse temple | L | /temples and a detail page. | [ ] |
| 6 | Search hotel | L | /hotels: search by name/price. Results paginate. | [ ] |
| 7 | View purohit | L | /purohits detail shows languages, listed price statement. | [ ] |
| 8 | Submit booking | L (+A status machine) | Signed in: Book a hotel with a price at/above the listed minimum. Booking appears under Bookings as PENDING. A price below the listed minimum is rejected (400). | [ ] |
| 9 | Provider receives request | L | Sign in as the listing owner: `/provider/bookings` shows it; owner gets a notification. | [ ] |
| 10 | Admin approves provider | L (+A role route) | As Admin: /admin/hotels (or purohits/businesses) > Verify. Owner gets provider role (sign out/in) and `/provider` works. | [ ] |
| 11 | Notification received | L | Booking update appears in the bell/inbox (web) and Alerts (app). Push needs FCM + a dev build/APK. | [ ] |
| 12 | Emergency | L | /emergency shows only admin-verified numbers; empty sections say so. No hard-coded numbers anywhere. Add contacts under /admin/emergency-services first. | [ ] |
| 13 | Lost & Found | L (+A) | Report lost item; it is hidden until a moderator approves in /admin/lost-and-found; private fields never public. | [ ] |
| 14 | Family | L (+A service tests) | Create group, invite code on a second account, share location for 15 min, send alert; it stops sharing automatically. | [ ] |
| 15 | AI assistant | L | /api/assistant/status shows configured; as Admin `?probe=1` returns ok; ask "Which temples can I visit in one day?" in English and Telugu. | [ ] |
| 16 | Business dashboard | L | `/provider` shows listings, leads, analytics for the owner only. | [ ] |
| 17 | Advertisement | L | Create advertiser + campaign + placement in /admin; ad shows in the slot with a "Sponsored" label; clicks counted. | [ ] |
| 18 | SEO pages | B | `/robots.txt`, `/sitemap.xml`, `/privacy`, `/terms`, `/refund-policy`, `/about`, `/contact`, `/delete-account` return 200 with canonical + title (verified on a production build). Check canonical host is your domain. | [ ] |
| 19 | Telugu content | B+L | EN/తెలుగు switch translates menus, forms, home, footer, app screens (verified in server HTML). Record content needs Telugu fields filled in admin. | [ ] |
| 20 | Mobile responsive | L | Chrome DevTools at 360x800, 768 and 1280 widths: no horizontal scroll, header hamburger below 1280. Android app on a real phone. | [ ] |

## Permission tests (A, automated)
`guards.test.ts`, `requireApiRole.test.ts`, role route test (ADMIN cannot mint ADMIN), booking status route tests, family/lost-found/notification service tests, deleteAccount guard tests (staff/provider accounts refused).

## Rules tests (run on your machine)
    npm i -g firebase-tools
    firebase emulators:exec --only firestore "npx vitest run src/__tests__/firestore.rules.test.ts"
Includes the new Sprint 12 cases: no self-approval, owners cannot change approvalStatus, group/booking/lead/lost-found direct writes denied.

## Smoke test after every production deploy (5 minutes)
1 home loads, 2 /login works, 3 /ghats, 4 /emergency, 5 /assistant answers, 6 /api/assistant/status, 7 one booking on a test listing, 8 /sitemap.xml.
