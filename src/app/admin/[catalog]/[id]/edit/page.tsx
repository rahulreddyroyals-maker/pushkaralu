import { notFound } from "next/navigation";
import { CatalogEntityForm } from "@/components/catalog/CatalogEntityForm";
import { getCatalogDefinition } from "@/features/catalog/registry";
import { getCatalog } from "@/lib/catalog/server/repository";
import { loadRefOptions } from "@/lib/catalog/server/refOptions";

export const dynamic = "force-dynamic";

export default async function EditCatalogRecordPage({ params }: { params: Promise<{ catalog: string; id: string }> }) {
  const { catalog, id } = await params;
  const def = getCatalogDefinition(catalog);
  if (!def) notFound();
  const record = await getCatalog(def, id, { includeUnpublished: true });
  if (!record) notFound();
  const refOptions = await loadRefOptions(def);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Edit {def.label.toLowerCase()}</h1>
      <CatalogEntityForm catalogKey={def.key} initial={record} refOptions={refOptions} />
    </div>
  );
}
