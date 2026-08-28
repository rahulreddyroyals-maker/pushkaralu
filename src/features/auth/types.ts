import type { Role } from "@/types/roles";
import type { SupportedLocale } from "@/types/domain";

/**
 * The authenticated user as known on the client — combines the Firebase
 * Auth user with the role read from the ID token's custom claim (NOT from
 * Firestore, and NOT from anywhere client-writable). `role` is null while
 * the token is still loading, and stays null if no claim has been set
 * (treated as least-privilege, not defaulted to USER on the client).
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: Role | null;
}

/**
 * Firestore `users/{uid}` document shape — see docs/DATABASE_SCHEMA.md.
 * `role` here is a DENORMALIZED COPY for display/query convenience only.
 * It is written exclusively by server-side code (see
 * src/lib/auth/session.ts, src/app/api/admin/users/[uid]/role/route.ts)
 * and Firestore rules must never treat this field as authoritative.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  role: Role;
  locale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
}
