import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/config/app";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <Link href={ROUTES.home} className="mb-8 flex flex-col items-center">
        <span className="text-xl font-bold tracking-tight text-river-deep">Pushkaralu</span>
        <svg aria-hidden viewBox="0 0 120 6" className="h-1.5 w-[100px]" preserveAspectRatio="none">
          <path
            d="M0 3 Q 15 0, 30 3 T 60 3 T 90 3 T 120 3"
            stroke="url(#auth-river-gradient)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="auth-river-gradient" x1="0" y1="0" x2="120" y2="0">
              <stop offset="0%" stopColor="var(--color-river-current)" />
              <stop offset="100%" stopColor="var(--color-saffron)" />
            </linearGradient>
          </defs>
        </svg>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
