"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ADMIN_NAV } from "./admin-nav";

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();

  const content = (
    <nav aria-label="Admin" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link href="/admin" className="px-2 text-lg font-bold tracking-tight text-white">
        Pushkaralu <span className="text-saffron">Admin</span>
      </Link>
      {ADMIN_NAV.map((section) => (
        <div key={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            {section.title}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-river-deep lg:block">
        {content}
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={onCloseMobile} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-river-deep shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
