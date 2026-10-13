# Environments: Development, Staging, Production

| | Development | Staging | Production |
|---|---|---|---|
| Purpose | your computer | full rehearsal with real services in test mode | live users |
| Firebase project | `pushkaralu-dev` (or a Firebase emulator) | `pushkaralu-staging` | `pushkaralu-india` |
| Web | `npm run dev` on localhost:3000 | Vercel Preview (branch `staging` or any PR) | Vercel Production (branch `main`) |
| Mobile build | Expo Go / dev client (`development` profile) | `staging` profile APK (internal) | `production` profile AAB to Play |
| Razorpay | test keys | test keys | live keys (after KYC) |
| Groq | any key | separate key | separate key |
| Demo data | `npm run seed` allowed | allowed | **never** (seed data is marked `[Demo]`) |

Why separate Firebase projects: a mistake in staging (rules, data, role grants) can never touch real users. If you only want one project for now, use the single project for staging and production but keep separate Vercel environments and Razorpay modes, and never run `seed` against it after launch.

## Vercel setup (per environment: Production / Preview / Development scopes)
Required: `NEXT_PUBLIC_FIREBASE_*` (7 values), `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `NEXT_PUBLIC_SITE_URL` (the exact public https URL), `AI_PROVIDER=groq`, `GROQ_API_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET`.
Optional: `NEXT_PUBLIC_CONTACT_EMAIL`, `SUPER_ADMIN_EMAILS` (bootstrap only, then remove), `AI_MODEL` (leave unset), `NEXT_PUBLIC_MAPS_PROVIDER_API_KEY`.
Env changes apply only to NEW deployments: always Redeploy.

## Release flow
1. Work on a branch, open a PR: Vercel builds a Preview automatically (staging checks).
2. `npm run lint && npm test && npm run build` must pass (add as a GitHub check).
3. Deploy rules/indexes first when they changed: `firebase use <project> && firebase deploy --only firestore:rules,firestore:indexes` (answer **No** to deleting indexes).
4. Merge to `main`: Vercel promotes to Production. Then run the smoke test in ACCEPTANCE_TESTS.md.
5. Rollback: Vercel > Deployments > previous good deployment > Promote to Production (instant). Rules rollback: `git checkout <old> -- firestore.rules` and redeploy rules.

## Razorpay webhook
Dashboard > Webhooks: URL `https://<domain>/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `refund.processed`; the secret you set must equal `RAZORPAY_WEBHOOK_SECRET`.

## Firebase console checklist (each project)
Authentication: enable Email/Password + Google; Authorized domains include the site domain. Firestore: rules + indexes deployed. Cloud Messaging enabled. API key restrictions set. Delete the leaked service-account key; create a new one for Vercel only.
