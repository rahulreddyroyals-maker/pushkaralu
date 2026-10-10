import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("faqs", "te");

export default function Page() {
  return <ContentListPage sectionKey="faqs" lang="te" />;
}
