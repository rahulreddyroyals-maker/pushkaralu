import { LegalPage } from "@/features/legal/LegalPage";
import { REFUND } from "@/features/legal/content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Refund Policy", description: "How cancellations and refunds work for Pushkaralu bookings.", path: "/refund-policy" });

export default function Page() {
  return <LegalPage title="Refund Policy" sections={REFUND} />;
}
