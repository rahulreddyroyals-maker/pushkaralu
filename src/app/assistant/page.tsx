import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { AssistantChat } from "@/features/assistant/components/AssistantChat";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Pushkaralu AI Assistant",
  description: "Plan your Pushkaralu visit: ask about ghats, temples, hotels, purohits, transport and itineraries, in English or Telugu. Facts come from verified platform data.",
  path: "/assistant",
});

export default function AssistantPage() {
  return (
    <SiteShell>
      <AssistantChat />
    </SiteShell>
  );
}
