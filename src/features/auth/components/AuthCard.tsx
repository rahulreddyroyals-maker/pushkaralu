import type { ReactNode } from "react";
import { Card } from "@/components/ui";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Card padding="lg">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 border-t border-border pt-4 text-center text-sm">{footer}</div>}
    </Card>
  );
}

export function AuthErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-[rgba(201,59,59,0.08)] px-3 py-2 text-sm text-status-critical" role="alert">
      {message}
    </p>
  );
}

/** Maps common Firebase Auth error codes to messages that don't leak internals (spec §39). */
export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
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
