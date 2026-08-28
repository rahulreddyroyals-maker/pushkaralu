import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, DEFAULT_SEO } from "@/config/app";
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
  title: `${APP_NAME}${DEFAULT_SEO.titleSuffix}`,
  description: "Your complete digital companion for Pushkaralu pilgrimage and tourism.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
