import { LegalPage } from "@/features/legal/LegalPage";
import { PRIVACY } from "@/features/legal/content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Privacy Policy", description: "How Pushkaralu collects, uses and protects your personal data.", path: "/privacy" });

export default function Page() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY} />;
}
