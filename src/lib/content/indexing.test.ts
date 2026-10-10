import { describe, it, expect } from "vitest";
import { isIndexable, hasLanguage, availableLangs, pickLang } from "./indexing";
import { whatsappShareUrl, facebookShareUrl, shareTargets } from "../seo/share";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("indexing", () => {
  it("marks thin pages noindex", () => {
    expect(isIndexable("articles", { title: { en: "T" }, body: { en: words(50) } }, "en")).toBe(false);
    expect(isIndexable("articles", { title: { en: "T" }, body: { en: words(130) } }, "en")).toBe(true);
    expect(isIndexable("faqs", { title: { en: "Q" }, body: { en: words(15) } }, "en")).toBe(true);
  });
  it("respects the admin noindex flag", () => {
    expect(isIndexable("articles", { title: { en: "T" }, body: { en: words(500) }, noindex: true }, "en")).toBe(false);
  });
  it("needs real Telugu title+body for the Telugu page", () => {
    const rec = { title: { en: "T", te: "" }, body: { en: words(200), te: words(200) } };
    expect(hasLanguage(rec, "te")).toBe(false);
    expect(availableLangs(rec)).toEqual(["en"]);
    expect(availableLangs({ title: { en: "T", te: "తె" }, body: { en: "b", te: "బా" } })).toEqual(["en", "te"]);
    expect(pickLang({ en: " a " }, "en")).toBe("a");
  });
});

describe("share links", () => {
  it("encodes the title and url", () => {
    expect(whatsappShareUrl("A & B", "https://x.test/p?a=1")).toBe("https://wa.me/?text=A%20%26%20B%0Ahttps%3A%2F%2Fx.test%2Fp%3Fa%3D1");
    expect(facebookShareUrl("https://x.test/p")).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.test%2Fp");
  });
  it("uses the absolute canonical url", () => {
    expect(shareTargets("T", "/te/a", "https://x.test").url).toBe("https://x.test/te/a");
  });
});
