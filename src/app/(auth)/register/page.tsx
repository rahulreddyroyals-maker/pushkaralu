"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { AuthCard, AuthErrorText, friendlyAuthError } from "@/features/auth/components/AuthCard";
import { registerSchema } from "@/features/auth/schemas";
import { signUpWithEmail, signInWithGoogle } from "@/features/auth/client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/config/app";

/** Calls the server-controlled profile-creation endpoint — see /api/auth/register-profile. */
async function createServerProfile(displayName: string) {
  const auth = getFirebaseAuth();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return;
  await fetch("/api/auth/register-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, displayName, locale: "en" }),
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ displayName, email, password, confirmPassword });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signUpWithEmail(parsed.data.email, parsed.data.password, parsed.data.displayName);
      await createServerProfile(parsed.data.displayName);
      router.push(ROUTES.home);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      const user = await signInWithGoogle();
      await createServerProfile(user.displayName ?? "Pilgrim");
      router.push(ROUTES.home);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join Pushkaralu to book services and save your favorites."
      footer={
        <span className="text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-river-deep hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthErrorText message={error} />
        <Input
          label="Full name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint="At least 8 characters, with a letter and a number."
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-muted">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" fullWidth onClick={handleGoogle} disabled={submitting}>
        Continue with Google
      </Button>
    </AuthCard>
  );
}
