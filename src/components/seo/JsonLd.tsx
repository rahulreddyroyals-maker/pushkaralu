import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/seo/jsonld";

/** Renders structured data. Content is escaped by serializeJsonLd so it can't terminate the script element. */
export function JsonLd({ data }: { data: JsonLdData | (JsonLdData | null)[] | null }) {
  if (!data) return null;
  const list = Array.isArray(data) ? data.filter((d): d is JsonLdData => d !== null) : data;
  if (Array.isArray(list) && list.length === 0) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(list) }} />;
}
