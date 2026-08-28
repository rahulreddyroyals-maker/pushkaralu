"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { subscribeToAuthUser } from "./client";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthUser(async (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      // Keep the server session cookie in sync with the client SDK's auth
      // state. This covers token refresh (role changes) as well as
      // sign-in — NOT just the initial login, since onIdTokenChanged fires
      // on every token refresh, not only sign-in events.
      if (nextUser) {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          }).catch(() => {
            // Non-fatal: client-side auth state is still correct even if
            // the session cookie sync fails; SSR pages will just treat
            // the user as logged out until the next successful sync.
          });
        }
      }
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
