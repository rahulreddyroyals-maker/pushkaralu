import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { writeAuditLog } from "@/lib/audit/log";
import { getCatalogDefinition } from "@/features/catalog/registry";
import { CatalogConflictError, CatalogNotFoundError, type CatalogDefinition } from "../types";
import { createCatalog, deleteCatalog, listCatalog, setCatalogPublished, updateCatalog } from "./repository";

/**
 * Shared Route Handler bodies for every admin-managed catalog. The route
 * files under app/api/**\/[catalog] are thin wrappers so each HTTP verb
 * has exactly one implementation — authorization, validation, audit
 * logging and error mapping can't drift between modules.
 */

const MAX_PUBLIC_PAGE_SIZE = 24;

function resolve(catalog: string): CatalogDefinition | NextResponse {
  return getCatalogDefinition(catalog) ?? NextResponse.json({ error: "Unknown catalog" }, { status: 404 });
}

/** Maps domain errors to safe responses — never leaks Firestore internals or stack traces (spec §39). */
function errorResponse(error: unknown): NextResponse {
  if (error instanceof CatalogNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof CatalogConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  console.error("[catalog] unexpected error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function adminCreate(req: NextRequest, catalog: string): Promise<NextResponse> {
  const def = resolve(catalog);
  if (def instanceof NextResponse) return def;
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  const parsed = def.schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  try {
    const id = await createCatalog(def, parsed.data);
    await writeAuditLog({ actorUid: auth.user.uid, action: `${def.auditPrefix}_CREATED`, targetType: def.collection, targetId: id });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function adminUpdate(req: NextRequest, catalog: string, id: string): Promise<NextResponse> {
  const def = resolve(catalog);
  if (def instanceof NextResponse) return def;
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  const parsed = def.schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  try {
    await updateCatalog(def, id, parsed.data);
    await writeAuditLog({ actorUid: auth.user.uid, action: `${def.auditPrefix}_UPDATED`, targetType: def.collection, targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function adminDelete(_req: NextRequest, catalog: string, id: string): Promise<NextResponse> {
  const def = resolve(catalog);
  if (def instanceof NextResponse) return def;
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  try {
    await deleteCatalog(def, id);
    await writeAuditLog({ actorUid: auth.user.uid, action: `${def.auditPrefix}_DELETED`, targetType: def.collection, targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

const publishBody = z.object({ published: z.boolean() });

export async function adminSetPublished(req: NextRequest, catalog: string, id: string): Promise<NextResponse> {
  const def = resolve(catalog);
  if (def instanceof NextResponse) return def;
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  const parsed = publishBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await setCatalogPublished(def, id, parsed.data.published);
    await writeAuditLog({
      actorUid: auth.user.uid,
      action: `${def.auditPrefix}_${parsed.data.published ? "PUBLISHED" : "UNPUBLISHED"}`,
      targetType: def.collection,
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Public, published-only, private fields stripped. Filters are whitelisted by the definition. */
export async function publicList(req: NextRequest, catalog: string): Promise<NextResponse> {
  const def = resolve(catalog);
  if (def instanceof NextResponse) return def;
  const params = req.nextUrl.searchParams;

  const requested = Number(params.get("pageSize"));
  const pageSize = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_PUBLIC_PAGE_SIZE) : 12;
  const filters: Record<string, string> = {};
  for (const key of def.filterKeys) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }

  try {
    const result = await listCatalog(def, {
      pageSize,
      cursor: params.get("cursor"),
      search: params.get("search") ?? undefined,
      filters,
      publicView: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
