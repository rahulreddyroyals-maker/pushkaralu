import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { Card } from "@/components/ui";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_LABELS } from "@/features/businesses/types";

export const dynamic = "force-dynamic";

const LISTING_TYPES = [
  { href: "/provider/hotels/new", icon: "🏨", label: "Hotel", description: "List rooms near the ghats" },
  { href: "/provider/purohits/new", icon: "🙏", label: "Purohit", description: "Offer ritual services" },
];

export default async function RegisterBusinessPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/register-business");

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-ink">Register your business</h1>
        <p className="mt-1 text-ink-muted">
          Choose what you&apos;d like to list. An admin reviews every application before it goes live.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LISTING_TYPES.map((type) => (
            <Link key={type.href} href={type.href}>
              <Card hoverable padding="md" className="flex flex-col gap-2">
                <span className="text-2xl">{type.icon}</span>
                <p className="font-semibold text-ink">{type.label}</p>
                <p className="text-sm text-ink-muted">{type.description}</p>
              </Card>
            </Link>
          ))}
          {BUSINESS_CATEGORIES.map((category) => (
            <Link key={category} href={`/provider/businesses/new?category=${category}`}>
              <Card hoverable padding="md" className="flex flex-col gap-2">
                <span className="text-2xl">🏬</span>
                <p className="font-semibold text-ink">{BUSINESS_CATEGORY_LABELS[category]}</p>
                <p className="text-sm text-ink-muted">List your {BUSINESS_CATEGORY_LABELS[category].toLowerCase()} service</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
