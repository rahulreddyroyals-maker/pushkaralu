import Image from "next/image";
import Link from "next/link";
import { Card } from "./Card";
import { Badge } from "./Badge";

interface LocationCardProps {
  href: string;
  image?: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; tone?: "neutral" | "saffron" | "success" | "warning" | "danger" | "info" };
  meta?: string;
  price?: string;
}

/**
 * Content card for directory listings — ghats, temples, hotels, purohits,
 * boats, restaurants. Generic on purpose: feature-specific fields (crowd
 * status, pricing, rating) are passed in, not hardcoded to one entity type.
 */
export function LocationCard({ href, image, title, subtitle, badge, meta, price }: LocationCardProps) {
  return (
    <Link href={href} className="group block">
      <Card hoverable padding="none" className="overflow-hidden">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-river-mist">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-river-current/40">
              <span className="text-3xl">🏞️</span>
            </div>
          )}
          {badge && (
            <div className="absolute left-3 top-3">
              <Badge tone={badge.tone} dot>
                {badge.label}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-4">
          <p className="font-semibold text-ink">{title}</p>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-2 flex items-center justify-between">
            {meta && <span className="font-data text-xs text-ink-muted">{meta}</span>}
            {price && <span className="font-data text-sm font-medium text-river-deep">{price}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
