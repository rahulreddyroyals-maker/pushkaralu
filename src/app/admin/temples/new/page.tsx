import { TempleForm } from "@/features/temples/components/TempleForm";

export default function NewTemplePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">New temple</h1>
      <TempleForm />
    </div>
  );
}
