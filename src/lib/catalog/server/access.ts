import "server-only";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { isAdminRole } from "@/types/roles";
import type { CatalogDefinition } from "../types";

/** Page-level gate for the generic admin catalog screens: admin-only catalogs (advertising) are closed to editors/moderators. */
export async function requireCatalogAccess(def: CatalogDefinition): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login?redirect=/admin");
  if (def.adminOnly && !(user.role && isAdminRole(user.role))) redirect("/admin?error=forbidden");
}
