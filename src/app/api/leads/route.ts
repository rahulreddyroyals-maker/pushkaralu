import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { leadInputSchema } from "@/features/leads/schemas";
import { createLead, listLeadsForProvider } from "@/features/leads/api";
import { resolveListingOwnerId } from "@/features/leads/resolveOwner";
import { getAdminDb } from "@/lib/firebase/admin";
import { isAdminRole } from "@/types/roles";
import { CATALOG_LEAD_TARGETS, isCatalogLeadType, type LeadProviderType } from "@/features/leads/types";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { getCatalog } from "@/lib/catalog/server/repository";

/**
 * The public "inquiry/booking request" mechanism (spec Module 4) —
 * signed-in users only, both to prevent anonymous spam and because the
 * provider needs a real contact to follow up with. Never exposes the
 * PROVIDER's contact info to the requester directly — see
 * features/hotels/types.ts Hotel.contactPhone comment.
 */
export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  // Catalog targets must exist and be published — otherwise anyone could fill the admin queue with inquiries against random ids.
  if (isCatalogLeadType(parsed.data.providerType)) {
    const def = requireCatalogDefinition(CATALOG_LEAD_TARGETS[parsed.data.providerType].catalogKey);
    if (!(await getCatalog(def, parsed.data.providerId))) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
  }

  const db = getAdminDb();
  const profileSnapshot = await db.collection("users").doc(user.uid).get();
  const displayName = (profileSnapshot.data()?.displayName as string | undefined) ?? "A visitor";

  const id = await createLead(user.uid, displayName, parsed.data);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

/** GET ?providerId=&providerType= — the provider dashboard's "Inquiries" view. Only the listing's own owner (or an admin) can read its leads. */
export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const providerId = req.nextUrl.searchParams.get("providerId");
  const providerType = req.nextUrl.searchParams.get("providerType") as LeadProviderType | null;
  if (!providerId || !providerType) {
    return NextResponse.json({ error: "providerId and providerType are required" }, { status: 400 });
  }

  if (!user.role || !isAdminRole(user.role)) {
    const ownerId = await resolveListingOwnerId(providerType, providerId);
    if (ownerId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const leads = await listLeadsForProvider(providerId);
  return NextResponse.json({ items: leads });
}
