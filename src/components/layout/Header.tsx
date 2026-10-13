"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ROUTES } from "@/config/app";
import { PRIMARY_NAV } from "./nav-links";
import { useAuth } from "@/features/auth/AuthProvider";
import { RoleGate } from "@/components/auth/RoleGate";
import { STAFF_ROLES } from "@/types/roles";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { signOutUser } from "@/features/auth/client";

function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    onNavigate?.();
    router.push(ROUTES.home);
    router.refresh();
  }

  if (loading) return <div className="h-9 w-20" aria-hidden />;

  if (!user) {
    return (
      <>
        <Link href="/login" onClick={onNavigate}>
          <Button variant="outline" size="sm" fullWidth>
            Sign in
          </Button>
        </Link>
        <Link href={ROUTES.registerBusiness} onClick={onNavigate}>
          <Button size="sm" fullWidth>
            Register business
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <RoleGate allow={STAFF_ROLES}>
        <Link href="/admin" onClick={onNavigate}>
          <Button variant="outline" size="sm" fullWidth>
            Admin
          </Button>
        </Link>
      </RoleGate>
      <NotificationBell onNavigate={onNavigate} />
      <Link href="/profile" onClick={onNavigate}>
        <Button variant="ghost" size="sm" fullWidth>
          {user.displayName ?? "Profile"}
        </Button>
      </Link>
      <Button size="sm" fullWidth onClick={handleSignOut}>
        Sign out
      </Button>
    </>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-raised/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2" aria-label="Pushkaralu home">
          <Image src="/logo.png" alt="" width={40} height={40} priority className="h-10 w-10 rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-river-deep">Pushkaralu</span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden lg:flex lg:items-center lg:gap-1">
          {PRIMARY_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-river-mist hover:text-river-deep"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AuthControls />
        </div>

        {/* Mobile nav toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink lg:hidden"
        >
          <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile navigation panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav-panel"
          aria-label="Mobile primary"
          className="border-t border-border bg-surface-raised px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-2 py-3 text-sm font-medium text-ink hover:bg-river-mist"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <AuthControls onNavigate={() => setMobileOpen(false)} />
          </div>
        </nav>
      )}
    </header>
  );
}
