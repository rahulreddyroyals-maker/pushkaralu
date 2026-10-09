import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { Hero } from "@/components/layout/Hero";
import { ServiceCard, Badge } from "@/components/ui";
import { ROUTES } from "@/config/app";

/**
 * Homepage shell — Sprint 1 (Design System & Application Shell).
 * Structure and visual design only. Real event data, live ghat status,
 * and featured listings are wired in when Events/Ghats/Purohits ship in
 * their own sprints (see docs/SPRINT_DEPENDENCY_MAP.md) — this renders
 * with static placeholder content so the shell is honestly representable
 * before that data exists, not faked as live.
 */
export default async function Home() {
  const dict = await getDictionary(DEFAULT_LOCALE);

  const services = [
    { href: ROUTES.ghats, icon: "🌊", label: "Ghats", description: "Staff crowd updates" },
    { href: ROUTES.temples, icon: "🛕", label: "Temples", description: "History & timings" },
    { href: ROUTES.hotels, icon: "🏨", label: "Hotels", description: "Stay near the ghats" },
    { href: ROUTES.purohits, icon: "🙏", label: "Purohits", description: "Book ritual services" },
    { href: ROUTES.travel, icon: "🚕", label: "Travel", description: "Taxis & transfers" },
    { href: ROUTES.boats, icon: "🛶", label: "Boats", description: "River tourism" },
    { href: ROUTES.restaurants, icon: "🍽️", label: "Restaurants", description: "Vegetarian & family" },
    { href: ROUTES.emergency, icon: "🚑", label: "Emergency", description: "One-tap assistance" },
  ];

  return (
    <SiteShell>
      <Hero dict={dict} />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Everything for your visit</h2>
          <Badge tone="info">Sprint 1 — shell only</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.href} {...s} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="font-data text-xs uppercase tracking-wide text-ink-muted">
            Event dates, ghat status, and featured listings
          </p>
          <p className="max-w-md text-sm text-ink-muted">
            will appear here once the Event and Ghat modules ship — this shell
            intentionally does not fabricate live data ahead of that.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
