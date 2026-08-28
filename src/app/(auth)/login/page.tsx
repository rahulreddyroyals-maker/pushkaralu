"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Tabs } from "@/components/ui";
import { AuthCard, AuthErrorText, friendlyAuthError } from "@/features/auth/components/AuthCard";
import { loginSchema, phoneLoginSchema, phoneOtpSchema } from "@/features/auth/schemas";
import { signInWithEmail, signInWithGoogle, startPhoneSignIn, confirmPhoneCode } from "@/features/auth/client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ROUTES } from "@/config/app";
import type { ConfirmationResult } from "firebase/auth";

const PHONE_RECAPTCHA_ID = "phone-recaptcha-container";

/** Registers a server session cookie for an already-authenticated client user — used after email/Google/phone sign-in. */
async function syncServerSession() {
  const auth = getFirebaseAuth();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return;
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

function EmailLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signInWithEmail(parsed.data.email, parsed.data.password);
      await syncServerSession();
      onSuccess();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthErrorText message={error} />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        autoComplete="email"
      />
      <div>
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
        />
        <Link href="/forgot-password" className="mt-1.5 inline-block text-xs text-river-current hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function PhoneLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = phoneLoginSchema.safeParse({ phoneNumber });
    if (!parsed.success) {
      setFieldErrors({ phoneNumber: parsed.error.issues[0]?.message ?? "Invalid number" });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await startPhoneSignIn(parsed.data.phoneNumber, PHONE_RECAPTCHA_ID);
      setConfirmation(result);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = phoneOtpSchema.safeParse({ code });
    if (!parsed.success || !confirmation) {
      setFieldErrors({ code: parsed.success ? "Session expired, resend the code" : parsed.error.issues[0].message });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await confirmPhoneCode(confirmation, parsed.data.code);
      await syncServerSession();
      onSuccess();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AuthErrorText message={error} />
      {!confirmation ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-4">
          <Input
            label="Phone number"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            error={fieldErrors.phoneNumber}
            hint="Include country code, e.g. +91 for India."
          />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Sending code..." : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirmCode} className="flex flex-col gap-4">
          <Input
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={fieldErrors.code}
            inputMode="numeric"
            maxLength={6}
          />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Verifying..." : "Verify & sign in"}
          </Button>
        </form>
      )}
      {/* Invisible reCAPTCHA container required by Firebase phone auth. */}
      <div id={PHONE_RECAPTCHA_ID} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function goHome() {
    router.push(ROUTES.home);
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
      await syncServerSession();
      goHome();
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Pushkaralu."
      footer={
        <span className="text-ink-muted">
          New here?{" "}
          <Link href="/register" className="font-medium text-river-deep hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <AuthErrorText message={error} />
      <Tabs
        tabs={[
          { id: "email", label: "Email", content: <EmailLoginForm onSuccess={goHome} /> },
          { id: "phone", label: "Phone", content: <PhoneLoginForm onSuccess={goHome} /> },
        ]}
      />
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-muted">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" fullWidth onClick={handleGoogle}>
        Continue with Google
      </Button>
    </AuthCard>
  );
}
