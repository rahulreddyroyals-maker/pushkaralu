import { notFound } from "next/navigation";
import { getRitual } from "@/features/rituals/api";
import { RitualForm } from "@/features/rituals/components/RitualForm";

export default async function EditRitualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ritual = await getRitual(id, { includeUnpublished: true });
  if (!ritual) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Edit ritual</h1>
      <RitualForm initial={ritual} />
    </div>
  );
}
