import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { HotelForm } from "@/features/hotels/components/HotelForm";

export const dynamic = "force-dynamic";

export default async function NewHotelPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/provider/hotels/new");

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink">List your hotel</h1>
        <HotelForm />
      </div>
    </SiteShell>
  );
}
