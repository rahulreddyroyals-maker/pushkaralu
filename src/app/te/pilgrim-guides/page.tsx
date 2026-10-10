import { ContentListPage, contentListMetadata } from "@/features/content/pages";

export const dynamic = "force-dynamic";
export const metadata = contentListMetadata("pilgrim-guides", "te");

export default function Page() {
  return <ContentListPage sectionKey="pilgrim-guides" lang="te" />;
}
