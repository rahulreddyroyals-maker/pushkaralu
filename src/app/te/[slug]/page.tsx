import { HubPage, hubMetadata } from "@/features/seoHub/HubPage";

// On-demand ISR: the first request renders the page, then it is cached for 10 minutes.
export const revalidate = 600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return hubMetadata((await params).slug, "te");
}

export default async function Page({ params }: Props) {
  return <HubPage urlSlug={(await params).slug} lang="te" />;
}
