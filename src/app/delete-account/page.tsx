import { LegalPage } from "@/features/legal/LegalPage";
import { DELETE_ACCOUNT } from "@/features/legal/content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Delete your account", description: "How to delete your Pushkaralu account and what happens to your data.", path: "/delete-account" });

export default function Page() {
  return <LegalPage title="Delete your account" sections={DELETE_ACCOUNT} />;
}
