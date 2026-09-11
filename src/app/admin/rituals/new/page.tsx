import { RitualForm } from "@/features/rituals/components/RitualForm";

export default function NewRitualPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">New ritual</h1>
      <RitualForm />
    </div>
  );
}
