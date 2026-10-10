import "server-only";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { getCatalogByField, listCatalog, type StoredRecord } from "@/lib/catalog/server/repository";
import type { ContentKey } from "@/lib/content/indexing";
import type { ContentRecord } from "./definitions";

/** Published-only reads for the public content pages and the sitemap. */
export async function getContentBySlug(key: ContentKey, slug: string): Promise<ContentRecord | null> {
  const rec = await getCatalogByField(requireCatalogDefinition(key), "slug", slug, { publicView: true });
  return rec as ContentRecord | null;
}

export async function listContent(key: ContentKey, opts: { topic?: string; pageSize?: number; cursor?: string | null } = {}) {
  const res = await listCatalog(requireCatalogDefinition(key), {
    pageSize: opts.pageSize ?? 12,
    cursor: opts.cursor,
    publicView: true,
    filters: opts.topic ? { topic: opts.topic } : undefined,
  });
  return { items: res.items as unknown as ContentRecord[], nextCursor: res.nextCursor };
}

/** Everything published, for the sitemap. Bounded so one huge collection can't stall the request. */
export async function listAllContent(key: ContentKey, max = 500): Promise<ContentRecord[]> {
  const out: StoredRecord[] = [];
  let cursor: string | null | undefined;
  while (out.length < max) {
    const page = await listCatalog(requireCatalogDefinition(key), { pageSize: 100, cursor, publicView: true });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out.slice(0, max) as unknown as ContentRecord[];
}
