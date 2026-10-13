import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/config/app";
import { Tr } from "@/components/i18n/Tr";
import { FOOTER_COLUMNS } from "./nav-links";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-river-deep text-white">
      {/* Signature river-line, echoed here in reverse (saffron to current) to bookend the page */}
      <svg
        aria-hidden
        viewBox="0 0 1200 8"
        preserveAspectRatio="none"
        className="absolute -top-[1px] h-2 w-full"
      >
        <path
          d="M0 4 Q 150 0, 300 4 T 600 4 T 900 4 T 1200 4"
          stroke="url(#footer-river-gradient)"
          strokeWidth="3"
          fill="none"
        />
        <defs>
          <linearGradient id="footer-river-gradient" x1="0" y1="0" x2="1200" y2="0">
            <stop offset="0%" stopColor="var(--color-saffron)" />
            <stop offset="100%" stopColor="var(--color-river-current)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                <Tr>{col.title}</Tr>
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/85 hover:text-saffron">
                      <Tr>{link.label}</Tr>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-md" />
            <p className="text-sm font-semibold"><Tr>Pushkaralu</Tr></p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
            <Link href={ROUTES.about} className="hover:text-white">
              <Tr>About</Tr>
            </Link>
            <Link href={ROUTES.contact} className="hover:text-white">
              <Tr>Contact</Tr>
            </Link>
            <Link href="/terms" className="hover:text-white">
              <Tr>Terms</Tr>
            </Link>
            <Link href="/privacy" className="hover:text-white">
              <Tr>Privacy</Tr>
            </Link>
            <Link href="/delete-account" className="hover:text-white">
              <Tr>Delete account</Tr>
            </Link>
            <Link href="/refund-policy" className="hover:text-white">
              <Tr>Refund Policy</Tr>
            </Link>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} <Tr>Pushkaralu</Tr>. <Tr>All rights reserved.</Tr>
          </p>
        </div>
      </div>
    </footer>
  );
}
