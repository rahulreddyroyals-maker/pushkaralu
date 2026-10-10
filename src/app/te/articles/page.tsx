import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("articles", "te");

export default function Page() {
  return <ContentListPage sectionKey="articles" lang="te" />;
}
