import { describe, it, expect } from "vitest";
import { buildSitemap, DISALLOWED_PATHS } from "./sitemap";

const SITE = "https://p.test";
describe("sitemap", () => {
  it("emits one entry per language with hreflang alternates", () => {
    const out = buildSitemap([{ path: "/a", langs: ["en", "te"] }], SITE);
    expect(out.map((e) => e.url)).toEqual([`${SITE}/a`, `${SITE}/te/a`]);
    expect(out[0].alternates?.languages).toMatchObject({ "en-IN": `${SITE}/a`, "te-IN": `${SITE}/te/a` });
  });
  it("English-only pages carry no alternates", () => {
    expect(buildSitemap([{ path: "/a" }], SITE)[0].alternates).toBeUndefined();
  });
  it("supports Telugu-only and dedupes", () => {
    const out = buildSitemap([{ path: "/a", langs: ["te"] }, { path: "/a", langs: ["te"] }], SITE);
    expect(out.map((e) => e.url)).toEqual([`${SITE}/te/a`]);
  });
  it("blocks private areas", () => {
    expect(DISALLOWED_PATHS).toContain("/admin");
    expect(DISALLOWED_PATHS).toContain("/api/");
  });
});
