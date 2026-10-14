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
import { useTr } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

function AuthControls({ onNavigate, menu = false }: { onNavigate?: () => void; menu?: boolean }) {
  const tr = useTr();
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    onNavigate?.();
    router.push(ROUTES.home);
    router.refresh();
  }

  if (loading) return <div className="h-9 w-20" aria-hidden />;

  if (menu) {
    if (!user) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/login" onClick={onNavigate}>
            <Button variant="outline" fullWidth>{tr("Sign in")}</Button>
          </Link>
          <Link href={ROUTES.registerBusiness} onClick={onNavigate}>
            <Button fullWidth>{tr("Register business")}</Button>
          </Link>
        </div>
      );
    }
    const name = user.displayName ?? tr("Profile");
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gold/50 bg-saffron-light px-3 py-2.5">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-river-deep text-base font-semibold text-gold-light">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <Link href="/profile" onClick={onNavigate} className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{name}</span>
            <span className="block text-xs text-ink-muted">{tr("View profile")}</span>
          </Link>
          <NotificationBell onNavigate={onNavigate} />
        </div>
        <RoleGate allow={STAFF_ROLES}>
          <Link href="/admin" onClick={onNavigate}>
            <Button variant="outline" fullWidth>{tr("Admin")}</Button>
          </Link>
        </RoleGate>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg border border-river-deep/30 py-2.5 text-sm font-medium text-river-deep transition-colors hover:bg-river-mist"
        >
          {tr("Sign out")}
        </button>
      </div>
    );
  }

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
        <Button variant="ghost" size="sm" fullWidth className="max-w-[8rem] truncate">
          {user.displayName ?? tr("Profile")}
        </Button>
      </Link>
      <Button size="sm" fullWidth onClick={handleSignOut}>
        Sign out
      </Button>
    </>
  );
}

export function Header() {
  const tr = useTr();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/40 bg-surface-raised/95 backdrop-blur">
      <div aria-hidden className="gold-rule" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex items-center gap-2" aria-label="Pushkaralu home">
          <Image src="/logo.png" alt="" width={40} height={40} priority className="h-10 w-10 rounded-lg" />
          <span className="font-serif text-xl font-bold tracking-tight text-river-deep">{tr("Pushkaralu")}</span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden xl:flex xl:items-center xl:gap-1">
          {PRIMARY_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-river-mist hover:text-river-deep"
            >
              {tr(link.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <LanguageToggle />
          <AuthControls />
        </div>

        {/* Mobile nav toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/50 text-river-deep hover:bg-river-mist xl:hidden"
        >
          <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile navigation panel: dimmed backdrop + scrollable sheet */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-x-0 bottom-0 top-[67px] z-30 bg-ink/40 xl:hidden"
          />
          <nav
            id="mobile-nav-panel"
            aria-label="Mobile primary"
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-67px)] overflow-y-auto rounded-b-2xl border-b border-gold/50 bg-surface-raised px-4 pb-5 pt-3 shadow-xl xl:hidden"
          >
            <ul className="flex flex-col divide-y divide-border/70">
              {PRIMARY_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-2 py-3.5 text-base font-medium text-ink hover:text-river-deep"
                  >
                    <span>{tr(link.label)}</span>
                    <span aria-hidden className="text-gold">›</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="om-divider my-3 text-xs" aria-hidden>ॐ</div>
            <div className="flex items-center justify-between gap-3 px-2 pb-4">
              <span className="text-sm font-medium text-ink-muted">{tr("Language")}</span>
              <LanguageToggle />
            </div>
            <AuthControls menu onNavigate={() => setMobileOpen(false)} />
          </nav>
        </>
      )}
    </header>
  );
}
