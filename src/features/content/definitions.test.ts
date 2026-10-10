import { describe, it, expect } from "vitest";
import { CONTENT_DEFINITIONS, articleSchema, servicePageSchema } from "./definitions";

const L = (en: string, te = "") => ({ en, te });
const ok = { slug: "good-slug", title: L("T"), body: L("B"), topic: "ghats" };

describe("content CMS", () => {
  it("every content type is slug-routed with a unique slug", () => {
    for (const d of CONTENT_DEFINITIONS) {
      expect(d.slugRouted).toBe(true);
      expect(d.uniqueFields).toEqual(["slug"]);
      expect(d.titleField).toBe("title");
    }
  });
  it("English is required, Telugu is optional", () => {
    expect(articleSchema.safeParse(ok).success).toBe(true);
    expect(articleSchema.safeParse({ ...ok, title: L("") }).success).toBe(false);
    expect(articleSchema.safeParse({ ...ok, body: L("") }).success).toBe(false);
    expect(articleSchema.safeParse({ ...ok, title: L("T", "తె"), body: L("B", "బా") }).success).toBe(true);
  });
  it("rejects bad slugs and unknown topics", () => {
    expect(articleSchema.safeParse({ ...ok, slug: "Bad Slug" }).success).toBe(false);
    expect(articleSchema.safeParse({ ...ok, slug: "x" }).success).toBe(false);
    expect(articleSchema.safeParse({ ...ok, topic: "weather" }).success).toBe(false);
  });
  it("normalises the slug to lowercase", () => {
    const r = articleSchema.safeParse({ ...ok, slug: "Good-Slug" });
    expect(r.success && r.data.slug).toBe("good-slug");
  });
  it("service CTA must be a site path (no external or protocol-relative links)", () => {
    expect(servicePageSchema.safeParse({ ...ok, ctaPath: "/hotels" }).success).toBe(true);
    expect(servicePageSchema.safeParse({ ...ok, ctaPath: "https://evil.com" }).success).toBe(false);
    expect(servicePageSchema.safeParse({ ...ok, ctaPath: "//evil.com" }).success).toBe(false);
    expect(servicePageSchema.safeParse({ ...ok, ctaPath: "" }).success).toBe(true);
  });
});
