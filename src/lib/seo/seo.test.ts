import { describe, it, expect } from "vitest";
import { getSiteUrl, absoluteUrl } from "./site";
import { truncate, metaDescription, slugify, isValidSlug, wordCount } from "./text";
import { localizedPath, stripLangPrefix } from "./paths";
import { buildMetadata } from "./metadata";
import { serializeJsonLd, breadcrumbList, faqPage, article, clean } from "./jsonld";

const SITE = "https://pushkaralu.example";

describe("site url", () => {
  it("normalises env", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "pushkaralu.example/" })).toBe("https://pushkaralu.example");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://x.test" })).toBe("http://x.test");
    expect(getSiteUrl({})).toBe("http://localhost:3000");
  });
  it("builds absolute urls", () => {
    expect(absoluteUrl("/a", SITE)).toBe(`${SITE}/a`);
    expect(absoluteUrl("/", SITE)).toBe(SITE);
    expect(absoluteUrl("https://cdn.x/y.png", SITE)).toBe("https://cdn.x/y.png");
  });
});

describe("text", () => {
  it("truncates on a word boundary", () => {
    const t = truncate("alpha beta gamma delta epsilon", 20);
    expect(t.length).toBeLessThan(21);
    expect(t.endsWith("…")).toBe(true);
    expect(t).not.toContain("gamm…");
  });
  it("leaves short text alone and uses the fallback", () => {
    expect(metaDescription("short")).toBe("short");
    expect(metaDescription("", "fallback")).toBe("fallback");
  });
  it("slugifies and validates", () => {
    expect(slugify("Godavari Pushkaralu: Dates & Ghats!")).toBe("godavari-pushkaralu-dates-and-ghats");
    expect(isValidSlug("good-slug-1")).toBe(true);
    expect(isValidSlug("Bad Slug")).toBe(false);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("-x-")).toBe(false);
  });
  it("counts words", () => {
    expect(wordCount("  a  b c ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});

describe("paths", () => {
  it("adds and strips the Telugu prefix", () => {
    expect(localizedPath("/a", "te")).toBe("/te/a");
    expect(localizedPath("/", "te")).toBe("/te");
    expect(localizedPath("/a", "en")).toBe("/a");
    expect(stripLangPrefix("/te/a")).toEqual({ lang: "te", path: "/a" });
    expect(stripLangPrefix("/tea")).toEqual({ lang: "en", path: "/tea" });
  });
});

describe("buildMetadata", () => {
  it("sets canonical, OG and twitter", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/x", image: "/i.jpg" }, SITE);
    expect(m.alternates?.canonical).toBe(`${SITE}/x`);
    expect(m.openGraph).toMatchObject({ url: `${SITE}/x`, title: "T" });
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
    expect(m.alternates?.languages).toBeUndefined();
  });
  it("adds hreflang only when both languages exist", () => {
    const both = buildMetadata({ title: "T", path: "/x", availableLangs: ["en", "te"] }, SITE);
    expect(both.alternates?.languages).toMatchObject({ "en-IN": `${SITE}/x`, "te-IN": `${SITE}/te/x`, "x-default": `${SITE}/x` });
  });
  it("canonicalises Telugu to /te", () => {
    const te = buildMetadata({ title: "T", path: "/x", lang: "te", availableLangs: ["en", "te"] }, SITE);
    expect(te.alternates?.canonical).toBe(`${SITE}/te/x`);
  });
  it("marks noindex", () => {
    expect(buildMetadata({ title: "T", path: "/x", noindex: true }, SITE).robots).toMatchObject({ index: false });
  });
});

describe("json-ld", () => {
  it("escapes < so content cannot close the script tag", () => {
    expect(serializeJsonLd({ a: "</script><script>x" })).not.toContain("</script>");
  });
  it("builds breadcrumbs with positions", () => {
    const b = breadcrumbList([{ name: "Home", path: "/" }, { name: "Here" }], SITE) as { itemListElement: Record<string, unknown>[] };
    expect(b.itemListElement[0]).toMatchObject({ position: 1, item: SITE });
    expect(b.itemListElement[1].item).toBeUndefined();
  });
  it("faq returns null when empty", () => {
    expect(faqPage([])).toBeNull();
    expect(faqPage([{ question: "q", answer: "" }])).toBeNull();
    expect(faqPage([{ question: "q", answer: "a" }])).not.toBeNull();
  });
  it("article carries language and omits empty fields", () => {
    const a = article({ headline: "H", path: "/a", lang: "te" }, SITE);
    expect(a.inLanguage).toBe("te-IN");
    expect("image" in a).toBe(false);
  });
  it("clean prunes empties", () => {
    expect(clean({ a: "", b: [], c: { d: undefined }, e: 1 })).toEqual({ c: {}, e: 1 });
  });
});
