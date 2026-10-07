"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { Input, Select, Button, Badge } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { ImageUploader } from "@/components/admin/ImageUploader";

type ImageEntityType = ComponentProps<typeof ImageUploader>["entityType"];
import type { FieldDescriptor } from "@/lib/catalog/types";
import type { LocalizedText } from "@/types/domain";

export type RefOptions = Record<string, { value: string; label: string }[]>;

export interface FieldContext {
  imageFolder: string;
  entityId?: string;
  refOptions: RefOptions;
  /** Error messages keyed by dotted path ("days.0.title"). */
  errors: Record<string, string>;
}

interface FieldRendererProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
  ctx: FieldContext;
}

const textareaClass =
  "min-h-24 w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20";

function toNumberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** The single schema-driven field renderer — every catalog admin form is built from FieldDescriptors. */
export function FieldRenderer({ field, value, onChange, path, ctx }: FieldRendererProps) {
  const error = ctx.errors[path];

  switch (field.type) {
    case "localized":
      return (
        <LocalizedTextField
          label={field.label}
          value={(value as LocalizedText | undefined) ?? { en: "", te: "" }}
          onChange={onChange}
          multiline={field.multiline}
          error={error ?? ctx.errors[`${path}.en`] ?? ctx.errors[`${path}.te`]}
        />
      );

    case "text":
      if (field.multiline) {
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">{field.label}</label>
            <textarea className={textareaClass} value={(value as string | undefined) ?? ""} onChange={(e) => onChange(e.target.value)} />
            {error && <p className="mt-1 text-xs text-status-critical">{error}</p>}
          </div>
        );
      }
      return (
        <Input
          label={field.label}
          value={(value as string | undefined) ?? ""}
          placeholder={field.placeholder}
          hint={field.hint}
          error={error}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );

    case "number":
      return (
        <Input
          label={field.label}
          type="number"
          step={field.step ?? "1"}
          hint={field.hint}
          error={error}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(toNumberOrUndefined(e.target.value))}
        />
      );

    case "time":
      return (
        <Input
          label={field.label}
          type="time"
          hint={field.hint}
          error={error}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );

    case "date":
      return (
        <Input label={field.label} type="date" error={error} value={(value as string | undefined) ?? ""} onChange={(e) => onChange(e.target.value)} />
      );

    case "select":
      return (
        <Select
          label={field.label}
          options={field.options}
          error={error}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-river-current" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );

    case "tags":
      return <TagsField field={field} value={(value as string[] | undefined) ?? []} onChange={onChange} error={error} />;

    case "geo": {
      const geo = (value as { latitude: number; longitude: number } | undefined) ?? { latitude: 0, longitude: 0 };
      return (
        <div>
          <span className="mb-2 block text-sm font-medium text-ink">{field.label}</span>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="0.00001"
              value={geo.latitude}
              error={ctx.errors[`${path}.latitude`]}
              onChange={(e) => onChange({ ...geo, latitude: Number(e.target.value) })}
            />
            <Input
              label="Longitude"
              type="number"
              step="0.00001"
              value={geo.longitude}
              error={ctx.errors[`${path}.longitude`]}
              onChange={(e) => onChange({ ...geo, longitude: Number(e.target.value) })}
            />
          </div>
        </div>
      );
    }

    case "images":
      return (
        <div>
          <span className="mb-2 block text-sm font-medium text-ink">{field.label}</span>
          {ctx.entityId ? (
            <ImageUploader
              entityType={ctx.imageFolder as ImageEntityType}
              entityId={ctx.entityId}
              images={(value as string[] | undefined) ?? []}
              onChange={onChange}
            />
          ) : (
            <p className="text-sm text-ink-muted">Save first, then edit this record to add images.</p>
          )}
        </div>
      );

    case "seo": {
      const seo = (value as { title: LocalizedText; description: LocalizedText; canonicalPath?: string } | undefined) ?? {
        title: { en: "", te: "" },
        description: { en: "", te: "" },
      };
      return (
        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">{field.label}</h3>
          <div className="flex flex-col gap-4">
            <LocalizedTextField label="SEO title" value={seo.title} onChange={(title) => onChange({ ...seo, title })} error={ctx.errors[`${path}.title.en`] ?? ctx.errors[`${path}.title.te`]} />
            <LocalizedTextField
              label="SEO description"
              value={seo.description}
              onChange={(description) => onChange({ ...seo, description })}
              multiline
              error={ctx.errors[`${path}.description.en`] ?? ctx.errors[`${path}.description.te`]}
            />
            <Input
              label="Canonical path"
              hint="Leave blank to use the default for this record."
              value={seo.canonicalPath ?? ""}
              error={ctx.errors[`${path}.canonicalPath`]}
              onChange={(e) => onChange({ ...seo, canonicalPath: e.target.value })}
            />
          </div>
        </div>
      );
    }

    case "ref": {
      const opts = ctx.refOptions[field.refKey] ?? [];
      return (
        <Select
          label={field.label}
          error={error}
          options={[{ value: "", label: field.optional ? "— None —" : "— Select —" }, ...opts]}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );
    }

    case "list": {
      const items = (value as Record<string, unknown>[] | undefined) ?? [];
      const update = (index: number, key: string, next: unknown) =>
        onChange(items.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
      return (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-ink">{field.label}</span>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {field.itemLabel} {index + 1}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
                  Remove
                </Button>
              </div>
              {field.fields.map((sub) => (
                <FieldRenderer key={sub.name} field={sub} value={item[sub.name]} onChange={(v) => update(index, sub.name, v)} path={`${path}.${index}.${sub.name}`} ctx={ctx} />
              ))}
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...(field.itemDefaults ?? {}) }])}>
              + Add {field.itemLabel.toLowerCase()}
            </Button>
          </div>
        </div>
      );
    }
  }
}

function TagsField({
  field,
  value,
  onChange,
  error,
}: {
  field: Extract<FieldDescriptor, { type: "tags" }>;
  value: string[];
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  if (field.suggestions) {
    return (
      <div>
        <span className="mb-2 block text-sm font-medium text-ink">{field.label}</span>
        <div className="flex flex-wrap gap-2">
          {field.suggestions.map((s) => (
            <button key={s.value} type="button" aria-pressed={value.includes(s.value)} onClick={() => toggle(s.value)}>
              <Badge tone={value.includes(s.value) ? "info" : "neutral"}>{s.label}</Badge>
            </button>
          ))}
        </div>
        {error && <p className="mt-1 text-xs text-status-critical">{error}</p>}
      </div>
    );
  }

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink">{field.label}</span>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((tag) => (
          <button key={tag} type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
            <Badge tone="info">{tag} ✕</Badge>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={field.placeholder ?? "Type and press Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Add
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-status-critical">{error}</p>}
    </div>
  );
}
