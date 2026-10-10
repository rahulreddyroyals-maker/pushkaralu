import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("location-pages", "te");

export default function Page() {
  return <ContentListPage sectionKey="location-pages" lang="te" />;
}
