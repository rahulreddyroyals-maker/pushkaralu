"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onIdTokenChanged,
  type User,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Role } from "@/types/roles";
import type { AuthUser } from "./types";

/**
 * Thin wrappers around the Firebase Auth client SDK. Kept in one file so
 * every call site (login/register/profile pages, AuthProvider) goes
 * through the same functions rather than calling the SDK ad hoc.
 */

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
  // Also clear the server session cookie — see src/lib/auth/session.ts.
  // Client sign-out alone leaves the httpOnly session cookie valid until
  // it expires, which would let protected Server Components still see a
  // "logged in" user after this call.
  await fetch("/api/auth/session", { method: "DELETE" });
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Phone auth requires a reCAPTCHA container element already mounted in the
 * DOM. `containerId` must reference an element rendered by the calling
 * component (see LoginForm's phone tab). Firebase requires an invisible
 * verifier per session, memoized here to avoid re-creating on re-render.
 */
export function getPhoneRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  }
  return recaptchaVerifier;
}

export async function startPhoneSignIn(phoneNumber: string, containerId: string): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const verifier = getPhoneRecaptcha(containerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<User> {
  const credential = await confirmation.confirm(code);
  return credential.user;
}

/**
 * Subscribes to auth + ID token changes (not just sign-in/out — this also
 * fires when a custom claim changes after a token refresh, which matters
 * since role changes take effect on next token refresh, not instantly).
 * Reads the `role` custom claim directly from the decoded token — never
 * from Firestore — so the client's notion of "my role" always traces back
 * to server-issued claims.
 */
export function subscribeToAuthUser(callback: (user: AuthUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    const tokenResult = await firebaseUser.getIdTokenResult();
    const role = (tokenResult.claims.role as Role | undefined) ?? null;
    callback({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      phoneNumber: firebaseUser.phoneNumber,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role,
    });
  });
}

/** Forces a token refresh — call after a role change so the new claim is picked up without a full re-login. */
export async function refreshIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}
