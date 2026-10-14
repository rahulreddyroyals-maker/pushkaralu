import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/config/app";
import { Tr } from "@/components/i18n/Tr";
import { FOOTER_COLUMNS } from "./nav-links";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-river-deep text-white">
      <div aria-hidden className="gold-rule absolute -top-[1px] left-0 w-full" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gold-light/80">
                <Tr>{col.title}</Tr>
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/85 hover:text-gold-light">
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
