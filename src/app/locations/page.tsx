import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("location-pages", "en");

export default function Page() {
  return <ContentListPage sectionKey="location-pages" lang="en" />;
}
