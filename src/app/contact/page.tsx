import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { buildMetadata } from "@/lib/seo/metadata";
import { CONTACT_EMAIL } from "@/features/legal/content";

export const metadata = buildMetadata({ title: "Contact us", description: "How to reach the Pushkaralu team for support, bookings, refunds and business listings.", path: "/contact" });

export default function ContactPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-ink">Contact us</h1>
        <p className="mt-4 leading-relaxed text-ink-muted">For support, booking or refund questions, or to list your business, write to us{CONTACT_EMAIL ? <> at <a className="text-river-deep underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></> : ""}. Please include your booking reference if you have one.</p>
        <p className="mt-3 leading-relaxed text-ink-muted"><strong>In an emergency, do not wait for a reply.</strong> Open the <Link className="text-river-deep underline" href="/emergency">Emergency page</Link> and call the verified numbers directly.</p>
      </article>
    </SiteShell>
  );
}
