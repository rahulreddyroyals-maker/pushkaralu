import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, DEFAULT_SEO } from "@/config/app";
import { getSiteUrl } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { organization, webSite } from "@/lib/seo/jsonld";
import { AuthProvider } from "@/features/auth/AuthProvider";

/**
 * Using the system font stack (defined in globals.css) instead of
 * next/font/google. Avoids a build-time network dependency on
 * fonts.googleapis.com — important for CI/build environments behind
 * firewalls or proxies, and one less external fetch to fail on.
 * Revisit with next/font/local + a self-hosted Telugu-supporting font
 * (e.g. Noto Sans Telugu) in the design-system sprint.
 */
export const metadata: Metadata = {
  // metadataBase makes every relative canonical / OG image absolute. Set NEXT_PUBLIC_SITE_URL per deployment.
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${APP_NAME}${DEFAULT_SEO.titleSuffix}`, template: `%s${DEFAULT_SEO.titleSuffix}` },
  description: "Your complete digital companion for Pushkaralu pilgrimage and tourism.",
  openGraph: { type: "website", siteName: APP_NAME, locale: "en_IN", images: [DEFAULT_SEO.defaultOgImage] },
  twitter: { card: "summary_large_image", images: [DEFAULT_SEO.defaultOgImage] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <JsonLd data={[webSite(APP_NAME), organization(APP_NAME)]} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
