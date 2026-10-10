import { describe, it, expect } from "vitest";
import { parseMarkdown, parseInline, safeHref, extractHeadings, markdownToPlainText } from "./markdown";

describe("safeHref", () => {
  it("allows http(s), mailto, tel and site-relative", () => {
    expect(safeHref("https://a.com")).toEqual({ href: "https://a.com", external: true });
    expect(safeHref("/ghats")).toEqual({ href: "/ghats", external: false });
    expect(safeHref("tel:+911234")?.external).toBe(true);
  });
  it("rejects script-capable and protocol-relative links", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
  });
});

describe("parseInline", () => {
  it("drops an unsafe link but keeps its label", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([{ t: "text", v: "click" }]);
  });
  it("treats raw HTML as plain text", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ t: "text", v: "<script>alert(1)</script>" }]);
  });
  it("parses bold, italic, code and links", () => {
    const nodes = parseInline("**a** *b* `c` [d](/x)");
    expect(nodes.map((n) => n.t)).toEqual(["strong", "text", "em", "text", "code", "text", "link"]);
  });
});

describe("parseMarkdown", () => {
  const md = "# Title\n\nIntro line one\ncontinues.\n\n## Getting there\n\n- bus\n- train\n\n1. first\n2. second\n\n> note\n\n---\n\n### Sub";
  const blocks = parseMarkdown(md);
  it("demotes # to h2 so the page keeps a single h1", () => {
    expect(blocks[0]).toMatchObject({ t: "heading", level: 2 });
  });
  it("joins wrapped paragraph lines", () => {
    expect(blocks[1]).toMatchObject({ t: "p" });
  });
  it("parses lists, quotes, rules", () => {
    expect(blocks.map((b) => b.t)).toEqual(["heading", "p", "heading", "ul", "ol", "quote", "hr", "heading"]);
  });
  it("makes unique heading ids", () => {
    const h = parseMarkdown("## Dates\n\n## Dates");
    expect(extractHeadings(h).map((x) => x.id)).toEqual(["dates", "dates-2"]);
  });
  it("keeps Telugu headings in ids", () => {
    expect(extractHeadings(parseMarkdown("## గోదావరి ఘాట్లు"))[0].id).toContain("గ");
  });
});

describe("markdownToPlainText", () => {
  it("strips markup", () => {
    expect(markdownToPlainText("## Hi\n\n**bold** and [link](/x)\n\n- one\n- two")).toBe("Hi bold and link one two");
  });
});
