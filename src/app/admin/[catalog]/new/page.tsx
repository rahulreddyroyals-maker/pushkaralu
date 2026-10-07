import { notFound } from "next/navigation";
import { CatalogEntityForm } from "@/components/catalog/CatalogEntityForm";
import { getCatalogDefinition } from "@/features/catalog/registry";
import { loadRefOptions } from "@/lib/catalog/server/refOptions";

export const dynamic = "force-dynamic";

export default async function NewCatalogRecordPage({ params }: { params: Promise<{ catalog: string }> }) {
  const { catalog } = await params;
  const def = getCatalogDefinition(catalog);
  if (!def) notFound();
  const refOptions = await loadRefOptions(def);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">New {def.label.toLowerCase()}</h1>
      <CatalogEntityForm catalogKey={def.key} refOptions={refOptions} />
    </div>
  );
}
