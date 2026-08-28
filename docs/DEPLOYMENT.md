# Pushkaralu (Web) — Run & Deploy

## 1. Prerequisites

- Node.js 20+ and npm
- A Firebase project (console.firebase.google.com) — Sprint 0 onward assumes
  this exists; nothing in this repo works end-to-end without one
- Firebase CLI: `npm install -g firebase-tools` (or use `npx firebase-tools`)

## 2. First-time setup

```bash
cd pushkaralu
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- **Client config** (`NEXT_PUBLIC_FIREBASE_*`) — Firebase Console → Project
  Settings → General → Your apps → Web app. Create a web app if none exists.
- **Admin config** (`FIREBASE_ADMIN_*`) — Firebase Console → Project
  Settings → Service Accounts → Generate new private key. Paste the
  `client_email` and `private_key` from the downloaded JSON. Keep the
  `\n` escapes literal in `private_key`.

In the Firebase Console, also enable:
- **Authentication** → Sign-in method → Email/Password, Google, Phone
  (all three are wired in Sprint 2)
- **Firestore Database** → Create database (production mode)

## 3. Run locally

```bash
npm run dev        # http://localhost:3000
```

## 4. Verify before deploying

```bash
npm run build       # production build
npm run lint         # ESLint
npx tsc --noEmit      # typecheck
npm test               # unit tests (guards, schemas, route handlers)
```

`npm run test:rules` requires the Firestore emulator, which requires
network access to Google's servers to download — run it on a machine with
normal internet access (not the sandbox this was built in):

```bash
firebase login
firebase use --add          # select/link your Firebase project once
firebase emulators:exec --only firestore "npm run test:rules"
```

## 5. Deploy Firestore Security Rules

Do this whenever `firestore.rules` changes — it's not part of the app
deploy below, and forgetting it means the app runs against stale rules:

```bash
firebase deploy --only firestore:rules
```

## 6. Deploy the Next.js app

This app uses SSR (Server Components, Route Handlers with the Admin SDK) —
it is **not** a static export, so it needs a Node-capable host. Two
straightforward options:

### Option A — Vercel (simplest for Next.js)

```bash
npm install -g vercel
vercel
```

Add all the `.env.local` variables to the Vercel project's Environment
Variables settings (Project → Settings → Environment Variables) — they are
not read from `.env.local` in production.

### Option B — Firebase App Hosting (keeps everything in one console)

```bash
firebase init apphosting     # first time only
firebase deploy --only apphosting
```

Set the same environment variables via `firebase apphosting:secrets:set`
for anything sensitive (the `FIREBASE_ADMIN_*` values especially — never
commit these).

## 7. Post-deploy checklist

- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] All env vars set on the hosting provider, not just `.env.local`
- [ ] Auth providers enabled in Firebase Console (Email/Password, Google, Phone)
- [ ] Google sign-in: add the production domain to Firebase Console →
      Authentication → Settings → Authorized domains
- [ ] Phone auth: Firebase's test-phone-number allowlist is for dev only —
      remove test numbers before real users sign up with phone auth
