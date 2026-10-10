import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { DISALLOWED_PATHS } from "@/lib/seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml", site),
    host: site,
  };
}
