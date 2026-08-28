import { notFound } from "next/navigation";
import { getTemple } from "@/features/temples/api";
import { TempleForm } from "@/features/temples/components/TempleForm";

export default async function EditTemplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temple = await getTemple(id, { includeUnpublished: true });
  if (!temple) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Edit temple</h1>
      <TempleForm initial={temple} />
    </div>
  );
}
