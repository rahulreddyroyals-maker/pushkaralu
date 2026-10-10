import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("faqs", "en");

export default function Page() {
  return <ContentListPage sectionKey="faqs" lang="en" />;
}
