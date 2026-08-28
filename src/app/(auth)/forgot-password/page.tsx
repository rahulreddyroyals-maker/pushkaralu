"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { AuthCard, AuthErrorText } from "@/features/auth/components/AuthCard";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { sendPasswordReset } from "@/features/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSent(true);
    } catch (err) {
      // Deliberately show the same success state even on
      // auth/user-not-found — confirming which emails exist is an
      // account-enumeration risk we don't need to take on.
      setSent(true);
      void err;
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className="text-sm text-ink-muted">
          If an account exists for <strong className="text-ink">{email}</strong>, we&apos;ve sent a link to reset
          your password.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-river-deep hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-medium text-river-deep hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthErrorText message={error} />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
          autoComplete="email"
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
