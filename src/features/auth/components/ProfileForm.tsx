"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Badge, Card } from "@/components/ui";
import { profileUpdateSchema } from "@/features/auth/schemas";
import { signOutUser } from "@/features/auth/client";
import type { Role } from "@/types/roles";
import { ROUTES } from "@/config/app";

interface ProfileFormProps {
  initialDisplayName: string;
  initialLocale: "en" | "te";
  email: string | null;
  role: Role | null;
}

export function ProfileForm({ initialDisplayName, initialLocale, email, role }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [locale, setLocale] = useState<"en" | "te">(initialLocale);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ displayName, locale });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStatus("saving");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    } catch {
      setStatus("error");
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOutUser();
    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">{email ?? "No email on file"}</p>
        </div>
        {role && <Badge tone="info">{role}</Badge>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
        />
        <Select
          label="Preferred language"
          value={locale}
          onChange={(e) => setLocale(e.target.value as "en" | "te")}
          options={[
            { value: "en", label: "English" },
            { value: "te", label: "తెలుగు (Telugu)" },
          ]}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save changes"}
          </Button>
          {status === "saved" && <span className="text-sm text-status-low">Saved</span>}
          {status === "error" && <span className="text-sm text-status-critical">Couldn&apos;t save. Try again.</span>}
        </div>
      </form>

      <div className="border-t border-border pt-4">
        <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </Card>
  );
}
