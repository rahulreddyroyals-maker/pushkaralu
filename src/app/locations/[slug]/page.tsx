import { ContentDetailPage, contentDetailMetadata } from "@/features/content/pages";

// On-demand ISR: rendered at first request, then cached for 5 minutes (no build-time database access needed).
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return contentDetailMetadata("location-pages", (await params).slug, "en");
}

export default async function Page({ params }: Props) {
  return <ContentDetailPage sectionKey="location-pages" slug={(await params).slug} lang="en" />;
}
