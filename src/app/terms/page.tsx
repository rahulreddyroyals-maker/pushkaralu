import { LegalPage } from "@/features/legal/LegalPage";
import { TERMS } from "@/features/legal/content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Terms of Use", description: "The terms for using the Pushkaralu website and app.", path: "/terms" });

export default function Page() {
  return <LegalPage title="Terms of Use" sections={TERMS} />;
}
