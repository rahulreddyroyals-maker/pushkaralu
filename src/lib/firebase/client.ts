/**
 * Firebase CLIENT SDK — safe to import from browser/client components.
 *
 * Do NOT put service account credentials or any admin secret here.
 * All values are public Firebase web config (safe to expose) and are
 * read from NEXT_PUBLIC_* env vars so they are inlined at build time.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function assertClientConfig() {
  const required: Array<keyof typeof firebaseConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "appId",
  ];
  const missing = required.filter((key) => !firebaseConfig[key]);
  if (missing.length > 0) {
    // Thrown only when actually initializing, so builds without env vars
    // (e.g. CI type-checking) don't fail — only runtime usage does.
    throw new Error(
      `Missing Firebase client env vars: ${missing
        .map((k) => `NEXT_PUBLIC_FIREBASE_${k.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`)
        .join(", ")}`
    );
  }
}

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    assertClientConfig();
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}
