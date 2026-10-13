import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Tr } from "@/components/i18n/Tr";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Card padding="lg">
      <h1 className="text-xl font-semibold text-ink"><Tr>{title}</Tr></h1>
      {subtitle && <p className="mt-1 text-sm text-ink-muted"><Tr>{subtitle}</Tr></p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 border-t border-border pt-4 text-center text-sm">{footer}</div>}
    </Card>
  );
}

export function AuthErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-[rgba(201,59,59,0.08)] px-3 py-2 text-sm text-status-critical" role="alert">
      <Tr>{message}</Tr>
    </p>
  );
}

/** Maps common Firebase Auth error codes to messages that don't leak internals (spec §39). */
export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (code && typeof console !== "undefined") console.error("[auth] Firebase error:", code, (error as { message?: string })?.message);
  switch (code) {
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return "Sign-up is not enabled yet. The site administrator must enable Email/Password sign-in in Firebase Authentication.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/app-not-authorized":
      return "The site's Firebase configuration is invalid. Please contact the administrator.";
    case "auth/unauthorized-domain":
      return "This website's domain is not authorized in Firebase. The administrator must add it under Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/password-does-not-meet-requirements":
      return "Password does not meet the requirements. Use at least 8 characters with a letter and a number.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/weak-password":
      return "Please choose a stronger password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/invalid-phone-number":
      return "Enter a valid phone number.";
    case "auth/invalid-verification-code":
      return "That code didn't match. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
