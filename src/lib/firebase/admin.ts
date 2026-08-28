/**
 * Firebase ADMIN SDK — SERVER ONLY.
 *
 * Never import this file from a Client Component or anything that ends up
 * in the browser bundle. It reads a service account and has full
 * privileged access to the project (bypasses Firestore security rules).
 *
 * Usage: import from Route Handlers, Server Actions, or Cloud Functions.
 */
import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function buildServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private key is stored with literal \n escapes in env files; unescape here.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return { projectId, clientEmail, privateKey };
}

let adminApp: App;

export function getFirebaseAdminApp(): App {
  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert(buildServiceAccount()),
    });
  } else {
    adminApp = getApps()[0]!;
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}
