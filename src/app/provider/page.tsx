import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/session";
import { listHotels } from "@/features/hotels/api";
import { listPurohits } from "@/features/purohits/api";
import { listBusinesses } from "@/features/businesses/api";
import { BUSINESS_CATEGORY_LABELS } from "@/features/businesses/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { Card, Badge, Button, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * "Admin must approve providers" (spec) means THIS page — not /admin —
 * is where an owner manages their own listing content; admin's job is
 * the approve/reject decision (see /admin/hotels etc.), not editing the
 * listing on the owner's behalf. Deliberately queries all three listing
 * types by ownerId regardless of the caller's current role, since a
 * brand-new PENDING application exists before any role is granted.
 */
export default async function ProviderDashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider");

  const [hotels, purohits, businesses] = await Promise.all([
    listHotels({ ownerId: user.uid }),
    listPurohits({ ownerId: user.uid }),
    listBusinesses({ ownerId: user.uid }),
  ]);

  const hasAnyListing = hotels.items.length > 0 || purohits.items.length > 0 || businesses.items.length > 0;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-ink">Provider Dashboard</h1>
        <p className="mt-1 text-ink-muted">Manage your listings, photos, and inquiries.</p>

        {!hasAnyListing && (
          <div className="mt-8">
            <EmptyState
              title="You don't have any listings yet"
              description="Register as a hotel, purohit, or local business to get started."
            />
            <div className="mt-4 flex justify-center">
              <Link href="/register-business">
                <Button>Register a listing</Button>
              </Link>
            </div>
          </div>
        )}

        {hotels.items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-semibold text-ink">Hotels</h2>
            <div className="flex flex-col gap-3">
              {hotels.items.map((h) => (
                <Card key={h.id} padding="md" className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{h.name.en}</p>
                    <Badge tone={h.approvalStatus === "VERIFIED" ? "success" : h.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                      {h.approvalStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/provider/hotels/${h.id}/edit`}>
                      <Button size="sm" variant="outline">Manage</Button>
                    </Link>
                    <Link href={`/provider/leads?providerId=${h.id}&providerType=hotel`}>
                      <Button size="sm" variant="ghost">Inquiries</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {purohits.items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-semibold text-ink">Purohit Profile</h2>
            <div className="flex flex-col gap-3">
              {purohits.items.map((p) => (
                <Card key={p.id} padding="md" className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{p.name.en}</p>
                    <Badge tone={p.approvalStatus === "VERIFIED" ? "success" : p.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                      {p.approvalStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/provider/purohits/${p.id}/edit`}>
                      <Button size="sm" variant="outline">Manage</Button>
                    </Link>
                    <Link href={`/provider/leads?providerId=${p.id}&providerType=purohit`}>
                      <Button size="sm" variant="ghost">Inquiries</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {businesses.items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-semibold text-ink">Business Listings</h2>
            <div className="flex flex-col gap-3">
              {businesses.items.map((b) => (
                <Card key={b.id} padding="md" className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{b.name.en}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge tone="info">{BUSINESS_CATEGORY_LABELS[b.category]}</Badge>
                      <Badge tone={b.approvalStatus === "VERIFIED" ? "success" : b.approvalStatus === "REJECTED" ? "danger" : "neutral"}>
                        {b.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/provider/businesses/${b.id}/edit`}>
                      <Button size="sm" variant="outline">Manage</Button>
                    </Link>
                    <Link href={`/provider/leads?providerId=${b.id}&providerType=business`}>
                      <Button size="sm" variant="ghost">Inquiries</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {hasAnyListing && (
          <div className="mt-8 border-t border-border pt-6">
            <Link href="/register-business" className="text-sm text-river-current hover:underline">
              + Register another listing
            </Link>
          </div>
        )}

        <Card padding="md" className="mt-8 text-sm text-ink-muted">
          Bookings will appear here once the booking module ships.
        </Card>
      </div>
    </SiteShell>
  );
}
