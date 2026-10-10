import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("service-pages", "te");

export default function Page() {
  return <ContentListPage sectionKey="service-pages" lang="te" />;
}
