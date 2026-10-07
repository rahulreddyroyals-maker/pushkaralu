import "server-only";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { getCatalog, getCatalogMany, listCatalog, listCatalogBy, type ListOptions, type StoredRecord } from "@/lib/catalog/server/repository";
import type { PageResult } from "@/lib/pagination";

/**
 * Server-side reads for the public pages. Always published-only and
 * private-field-stripped, so a page can't accidentally render an operator's
 * phone number — that choice is made here once, not per page.
 */
export async function loadPublicList(key: string, options: Omit<ListOptions, "publicView" | "includeUnpublished"> = {}): Promise<PageResult<StoredRecord>> {
  return listCatalog(requireCatalogDefinition(key), { pageSize: 12, ...options, publicView: true });
}

export async function loadPublic<T>(key: string, id: string): Promise<(StoredRecord & T) | null> {
  const record = await getCatalog(requireCatalogDefinition(key), id, { publicView: true });
  return record as (StoredRecord & T) | null;
}

export async function loadPublicMany<T>(key: string, ids: string[]): Promise<(StoredRecord & T)[]> {
  return (await getCatalogMany(requireCatalogDefinition(key), ids, { publicView: true })) as (StoredRecord & T)[];
}

export async function loadPublicBy<T>(key: string, field: string, value: string): Promise<(StoredRecord & T)[]> {
  return (await listCatalogBy(requireCatalogDefinition(key), field, value, { publicView: true })) as (StoredRecord & T)[];
}
