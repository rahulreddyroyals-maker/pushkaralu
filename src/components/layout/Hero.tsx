import { SearchBar } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/types";

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-river-mist/70 to-surface">
      {/* Signature river-line motif, large, behind the headline — the one bold gesture on the page */}
      <svg
        aria-hidden
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      >
        <path
          d="M-100 260 Q 150 180, 400 260 T 900 260 T 1400 260"
          stroke="url(#hero-river-gradient)"
          strokeWidth="120"
          fill="none"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="hero-river-gradient" x1="0" y1="0" x2="1200" y2="0">
            <stop offset="0%" stopColor="var(--color-river-current)" stopOpacity="0.18" />
            <stop offset="55%" stopColor="var(--color-saffron)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-river-current)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="font-data rounded-full bg-saffron-light px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#8a5410]">
          Godavari Pushkaralu 2027
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {dict.home.heroTitle}
        </h1>
        <p className="max-w-xl text-lg text-ink-muted">{dict.home.heroSubtitle}</p>
        <div className="w-full max-w-xl">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
