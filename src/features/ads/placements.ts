/**
 * Ad placements are *slots in the UI* — each needs a rendering component, so
 * the set of slots lives in code. What admins control (enable/disable, how
 * many ads show) is stored per slot in the `adPlacements` catalog.
 */
export const AD_FORMATS = ["BANNER", "HOMEPAGE_PROMOTION", "SPONSORED_LISTING", "SPONSORED_ARTICLE"] as const;
export type AdFormat = (typeof AD_FORMATS)[number];
export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  BANNER: "Banner (image + link)",
  HOMEPAGE_PROMOTION: "Homepage promotion (headline + call to action)",
  SPONSORED_LISTING: "Sponsored listing (promotes a hotel / purohit / business)",
  SPONSORED_ARTICLE: "Sponsored article (promotes a CMS article)",
};

export const PLACEMENT_KEYS = ["home_hero", "home_featured", "listings_top", "content_inline", "articles_featured"] as const;
export type PlacementKey = (typeof PLACEMENT_KEYS)[number];

export interface PlacementSpec {
  key: PlacementKey;
  label: string;
  where: string;
  formats: AdFormat[];
  defaultMaxItems: number;
  maxAllowed: number;
}

export const PLACEMENTS: Record<PlacementKey, PlacementSpec> = {
  home_hero: { key: "home_hero", label: "Homepage hero", where: "Top of the homepage, under the main header", formats: ["HOMEPAGE_PROMOTION", "BANNER"], defaultMaxItems: 1, maxAllowed: 1 },
  home_featured: { key: "home_featured", label: "Homepage featured row", where: "Homepage, below the services grid", formats: ["SPONSORED_LISTING", "SPONSORED_ARTICLE", "HOMEPAGE_PROMOTION"], defaultMaxItems: 3, maxAllowed: 6 },
  listings_top: { key: "listings_top", label: "Top of listing pages", where: "Hotels, purohits and travel list pages", formats: ["SPONSORED_LISTING", "BANNER"], defaultMaxItems: 2, maxAllowed: 4 },
  content_inline: { key: "content_inline", label: "Inside articles & guides", where: "Between the intro and body of articles, guides and FAQs", formats: ["BANNER", "SPONSORED_ARTICLE"], defaultMaxItems: 1, maxAllowed: 2 },
  articles_featured: { key: "articles_featured", label: "Articles page featured", where: "Top of the articles list", formats: ["SPONSORED_ARTICLE"], defaultMaxItems: 2, maxAllowed: 4 },
};

export const PLACEMENT_OPTIONS = PLACEMENT_KEYS.map((k) => ({ value: k, label: `${PLACEMENTS[k].label} — ${PLACEMENTS[k].where}` }));
export const isPlacementKey = (v: unknown): v is PlacementKey => (PLACEMENT_KEYS as readonly string[]).includes(String(v));
export const formatAllowedIn = (format: AdFormat, placement: PlacementKey) => PLACEMENTS[placement].formats.includes(format);
