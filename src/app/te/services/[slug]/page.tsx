import { ContentDetailPage, contentDetailMetadata } from "@/features/content/pages";

// On-demand ISR: rendered at first request, then cached for 5 minutes (no build-time database access needed).
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return contentDetailMetadata("service-pages", (await params).slug, "te");
}

export default async function Page({ params }: Props) {
  return <ContentDetailPage sectionKey="service-pages" slug={(await params).slug} lang="te" />;
}
