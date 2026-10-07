import Image from "next/image";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { ROUTES } from "@/config/app";
import { pick } from "@/lib/catalog/format";

interface Crumb {
  label: string;
  href?: string;
}

interface DetailShellProps {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: "neutral" | "saffron" | "success" | "warning" | "danger" | "info" }[];
  images?: string[];
  children: ReactNode;
}

/** Common frame for every catalog detail page: breadcrumb, heading, gallery, then module-specific sections. */
export function DetailShell({ crumbs, title, subtitle, badges = [], images = [], children }: DetailShellProps) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, ...crumbs]} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge key={b.label} tone={b.tone} dot>
                {b.label}
              </Badge>
            ))}
          </div>
        )}
        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-river-mist">
                <Image src={src} alt={`${title} photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </div>
    </SiteShell>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="md">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-3 text-sm text-ink-muted">{children}</div>
    </Card>
  );
}

/** Label/value rows; rows with an empty value are skipped so we never render "undefined" or fabricated placeholders. */
export function Facts({ rows }: { rows: [string, ReactNode | undefined | null | false | ""][] }) {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== false && v !== "");
  if (visible.length === 0) return <p className="text-sm text-ink-muted">Not specified</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {visible.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
          <dd className="text-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BadgeList({ items, empty = "Not specified" }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <span className="text-sm text-ink-muted">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Badge key={i} tone="info">
          {i}
        </Badge>
      ))}
    </div>
  );
}

/** generateMetadata helper — SEO title/description from the record, canonical from its stored path. */
export function catalogMetadata(
  record: { seo?: { title?: { en?: string }; description?: { en?: string }; canonicalPath?: string } } | null,
  fallbackTitle: string,
  fallbackDescription: string
): Metadata {
  if (!record) return {};
  return {
    title: record.seo?.title?.en || fallbackTitle,
    description: record.seo?.description?.en || fallbackDescription,
    alternates: record.seo?.canonicalPath ? { canonical: record.seo.canonicalPath } : undefined,
    openGraph: { title: record.seo?.title?.en || fallbackTitle, description: record.seo?.description?.en || fallbackDescription },
  };
}

export { pick };
