"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { hasAnyRole } from "@/lib/auth/guards";
import type { Role } from "@/types/roles";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * UI-layer role gating ONLY — hides/shows elements (e.g. an Admin link in
 * the header). This is a convenience, not a security boundary: the real
 * enforcement for any protected page or data write is the server-side
 * check (getServerUser + guards) and Firestore Security Rules. Never rely
 * on RoleGate alone to protect sensitive UI — assume a user could bypass
 * it and hit the underlying route/API directly.
 */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!hasAnyRole(user?.role, allow)) return fallback;
  return children;
}
