/**
 * ONE-TIME bootstrap: makes an existing account the first SUPER_ADMIN.
 * (Roles can only be granted by an existing Super Admin, so the very first one must be created from a trusted machine.)
 *
 *   1. Register the account on the website first (/register).
 *   2. Put the Firebase Admin credentials in .env.local (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY).
 *   3. npx tsx scripts/make-super-admin.ts you@example.com
 *   4. Sign out and sign in again on the website.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx scripts/make-super-admin.ts <email>");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Missing FIREBASE_ADMIN_* variables in .env.local");
  if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { role: "SUPER_ADMIN" });
  await getFirestore().collection("users").doc(user.uid).set(
    { uid: user.uid, email: user.email ?? email, displayName: user.displayName ?? "Super Admin", role: "SUPER_ADMIN", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await getFirestore().collection("auditLogs").add({ actorUid: "bootstrap-script", action: "ROLE_ASSIGNED", targetType: "user", targetId: user.uid, metadata: { newRole: "SUPER_ADMIN", reason: "bootstrap" }, createdAt: FieldValue.serverTimestamp() });
  console.log(`${email} (${user.uid}) is now SUPER_ADMIN. Sign out and sign in again.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
