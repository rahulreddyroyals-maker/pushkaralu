import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb, Button, Card } from "@/components/ui";
import { LostFoundListClient } from "@/components/lostFound/LostFoundListClient";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { listPublic } from "@/features/lostFound/service";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lost & Found",
  description: "Report and find lost people, phones, wallets, documents and luggage. Every report is reviewed by a moderator before it is shown.",
};

export default async function LostAndFoundPage() {
  const result = await listPublic(lostFoundDeps, {});
  const initial = result.ok ? result.data : { items: [], nextCursor: null };

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Lost & Found" }]} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Lost &amp; Found</h1>
            <p className="mt-1 max-w-2xl text-ink-muted">
              Every report is reviewed by a moderator before it appears here, and public listings never show phone numbers or ID numbers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/lost-and-found/report"><Button>Report lost / found</Button></Link>
            <Link href="/lost-and-found/mine"><Button variant="outline">My reports</Button></Link>
          </div>
        </div>

        <Card padding="md" className="mt-6 border-status-critical/40 bg-[rgba(201,59,59,0.05)]">
          <p className="text-sm text-ink">
            Missing person or child right now? <Link href="/emergency" className="font-semibold text-status-critical underline">Call emergency services first</Link>, then file a report here.
          </p>
        </Card>

        {!result.ok && <p role="alert" className="mt-4 text-sm text-status-critical">Couldn&apos;t load reports right now.</p>}
        <div className="mt-8">
          <LostFoundListClient initial={initial} />
        </div>
      </div>
    </SiteShell>
  );
}
