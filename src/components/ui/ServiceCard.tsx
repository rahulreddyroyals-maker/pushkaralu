import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "./Card";

interface ServiceCardProps {
  href: string;
  icon: ReactNode;
  label: string;
  description?: string;
}

/**
 * Quick-access tile for the homepage service grid (Ghats, Temples, Hotels,
 * Purohits, Travel, Emergency, ...). Icon-forward, minimal — the grid as a
 * whole is the visual element, not any single card.
 */
export function ServiceCard({ href, icon, label, description }: ServiceCardProps) {
  return (
    <Link href={href} className="group block">
      <Card hoverable padding="md" className="flex h-full flex-col items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-river-mist text-xl text-river-deep transition-colors group-hover:bg-saffron-light">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-ink">{label}</p>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </Card>
    </Link>
  );
}
