import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { BusinessForm } from "@/features/businesses/components/BusinessForm";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/features/businesses/types";

export const dynamic = "force-dynamic";

export default async function NewBusinessPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/register-business");

  const { category } = await searchParams;
  const defaultCategory = (BUSINESS_CATEGORIES as readonly string[]).includes(category ?? "") ? (category as BusinessCategory) : undefined;

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">List your business</h1>
        <BusinessForm defaultCategory={defaultCategory} />
      </div>
    </SiteShell>
  );
}
