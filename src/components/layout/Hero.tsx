import { Tr } from "@/components/i18n/Tr";
import { SearchBar } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/types";

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-saffron-light via-river-mist/60 to-surface">
      {/* Mandala / lotus motif behind the headline */}
      <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.16]" fill="none" stroke="var(--color-gold)" strokeWidth="1.5">
        {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => (
          <ellipse key={i} cx="200" cy="110" rx="26" ry="70" transform={`rotate(${i * 30} 200 200)`} />
        ))}
        {[0,1,2,3,4,5,6,7].map((i) => (
          <ellipse key={i} cx="200" cy="140" rx="16" ry="44" transform={`rotate(${i * 45 + 22.5} 200 200)`} stroke="var(--color-saffron)" />
        ))}
        <circle cx="200" cy="200" r="30" />
        <circle cx="200" cy="200" r="188" strokeDasharray="2 8" />
      </svg>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
        <span aria-hidden className="text-3xl leading-none text-saffron">ॐ</span>
        <span className="font-data rounded-full border border-gold/60 bg-saffron-light px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#7a4208]">
          <Tr>Godavari Pushkaralu 2027</Tr>
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          <Tr>{dict.home.heroTitle}</Tr>
        </h1>
        <p className="max-w-xl text-lg text-ink-muted"><Tr>{dict.home.heroSubtitle}</Tr></p>
        <div className="w-full max-w-xl">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
