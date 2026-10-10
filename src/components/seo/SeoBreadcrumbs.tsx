import { Breadcrumb } from "@/components/ui";
import { JsonLd } from "./JsonLd";
import { breadcrumbList } from "@/lib/seo/jsonld";

export interface SeoCrumb {
  label: string;
  /** Site path (already language-prefixed). Omit on the current page. */
  href?: string;
}

/** Visible breadcrumb trail plus matching BreadcrumbList structured data — one source, so they never disagree. */
export function SeoBreadcrumbs({ items }: { items: SeoCrumb[] }) {
  return (
    <>
      <Breadcrumb items={items} />
      <JsonLd data={breadcrumbList(items.map((c) => ({ name: c.label, path: c.href })))} />
    </>
  );
}
