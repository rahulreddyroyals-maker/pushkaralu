import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/ui";
import { ROUTES } from "@/config/app";

/** Frame shared by the public list pages (/travel, /boats, /parking, ...). */
export function CatalogPageFrame({
  title,
  intro,
  crumbs,
  children,
}: {
  title: string;
  intro: string;
  crumbs: { label: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, ...crumbs]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-ink-muted">{intro}</p>
        <div className="mt-8 flex flex-col gap-10">{children}</div>
      </div>
    </SiteShell>
  );
}

export function PageSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}
