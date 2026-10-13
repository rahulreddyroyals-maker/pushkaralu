import { SiteShell } from "@/components/layout/SiteShell";
import { buildMetadata } from "@/lib/seo/metadata";
import { OPERATOR } from "@/features/legal/content";

export const metadata = buildMetadata({ title: "About Pushkaralu", description: "Pushkaralu is a digital companion for pilgrims: ghats, temples, hotels, purohits, travel and safety information in one place.", path: "/about" });

export default function AboutPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">About Pushkaralu</h1>
        <p className="mt-4 leading-relaxed text-ink-muted">Pushkaralu is a digital companion for pilgrims and visitors: verified information on ghats, temples, hotels, purohits, transport, parking and emergency help, with booking requests, family safety groups, lost &amp; found and an AI assistant, in English and Telugu.</p>
        <p className="mt-3 leading-relaxed text-ink-muted">Crowd and status information is entered manually by event staff and is clearly marked with when it was last updated. We never present it as a live sensor reading, and we never invent emergency numbers: every contact in the directory is added and verified by administrators.</p>
        <p className="mt-3 leading-relaxed text-ink-muted">Operated by {OPERATOR}, Andhra Pradesh, India.</p>
      </article>
    </SiteShell>
  );
}
