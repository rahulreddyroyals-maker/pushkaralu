"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { FieldRenderer, type RefOptions } from "./FieldRenderer";
import { requireCatalogDefinition } from "@/features/catalog/registry";
import { formErrors, pruneEmpty } from "@/lib/catalog/formValues";

interface CatalogEntityFormProps {
  catalogKey: string;
  /** Existing record (edit mode). Server-owned fields (id, published, timestamps) are ignored on submit. */
  initial?: Record<string, unknown> & { id: string };
  refOptions: RefOptions;
}

/** One form for every catalog: fields come from the definition, validation from its zod schema (same schema the API re-runs server-side). */
export function CatalogEntityForm({ catalogKey, initial, refOptions }: CatalogEntityFormProps) {
  const def = requireCatalogDefinition(catalogKey);
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...def.defaults, ...(initial ?? {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setFormError(null);
    const payload = pruneEmpty(Object.fromEntries(def.fields.map((f) => [f.name, values[f.name]])));
    const parsed = def.schema.safeParse(payload);
    if (!parsed.success) {
      setErrors(formErrors(parsed.error.issues));
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(initial ? `/api/admin/catalog/${def.key}/${initial.id}` : `/api/admin/catalog/${def.key}`, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Request failed");
      }
      const body = (await res.json()) as { id?: string };
      // After creating, land on the edit page so images (which need an id) can be added straight away.
      router.push(initial ? `/admin/${def.key}` : `/admin/${def.key}/${body.id}/edit`);
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error && e.message !== "Request failed" ? e.message : `Couldn't save the ${def.label.toLowerCase()}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg" className="flex max-w-3xl flex-col gap-5">
      {formError && (
        <p role="alert" className="text-sm text-status-critical">
          {formError}
        </p>
      )}
      {def.fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
          path={field.name}
          ctx={{ imageFolder: def.imageFolder, entityId: initial?.id, refOptions, errors }}
        />
      ))}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : `Create ${def.label.toLowerCase()}`}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/admin/${def.key}`)}>
          Cancel
        </Button>
      </div>
      {!initial && <p className="text-xs text-ink-muted">New records are saved as drafts. Publish from the list when ready.</p>}
    </Card>
  );
}
