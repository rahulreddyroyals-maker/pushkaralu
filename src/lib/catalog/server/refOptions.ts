import "server-only";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import type { CatalogDefinition } from "../types";
import { listCatalog } from "./repository";

/** Admin-form dropdown data for every `ref` field in a definition (including refs nested inside lists). */
export async function loadRefOptions(def: CatalogDefinition): Promise<Record<string, { value: string; label: string }[]>> {
  const keys = new Set<string>();
  const walk = (fields: CatalogDefinition["fields"]) => {
    for (const f of fields) {
      if (f.type === "ref") keys.add(f.refKey);
      if (f.type === "list") walk(f.fields);
    }
  };
  walk(def.fields);

  const entries = await Promise.all(
    [...keys].map(async (key) => {
      const refDef = requireCatalogDefinition(key);
      const { items } = await listCatalog(refDef, { pageSize: 200, includeUnpublished: true });
      const options = items.map((item) => {
        const title = item[refDef.titleField] as { en?: string } | undefined;
        return { value: item.id, label: `${title?.en ?? item.id}${item.published ? "" : " (draft)"}` };
      });
      return [key, options] as const;
    })
  );
  return Object.fromEntries(entries);
}
