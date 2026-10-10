/**
 * Minimal, safe Markdown for CMS bodies. It parses to a small AST that React
 * renders as elements — there is NO raw-HTML path (raw HTML in the source is
 * just text), and links are limited to http(s), mailto, tel and site-relative
 * paths, so an admin (or a compromised admin account) cannot inject script.
 *
 * Supported: # ## ### headings, paragraphs, - / * bullet lists, 1. lists,
 * > quotes, --- rules, **bold**, *italic*, `code`, [text](url).
 */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[]; external: boolean };

export type Block =
  | { t: "heading"; level: 2 | 3 | 4; id: string; c: Inline[]; text: string }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "hr" };

export function safeHref(href: string): { href: string; external: boolean } | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h)) return { href: h, external: true };
  if (/^(mailto:|tel:)/i.test(h)) return { href: h, external: true };
  if (h.startsWith("/") && !h.startsWith("//")) return { href: h, external: false };
  return null;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^`([^`]+)`/.exec(rest))) {
      flush();
      out.push({ t: "code", v: m[1] });
      i += m[0].length;
    } else if ((m = /^\*\*([^*]+?)\*\*/.exec(rest))) {
      flush();
      out.push({ t: "strong", c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = /^\*([^*\s][^*]*?)\*/.exec(rest))) {
      flush();
      out.push({ t: "em", c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = /^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/.exec(rest))) {
      const safe = safeHref(m[2]);
      if (safe) {
        flush();
        out.push({ t: "link", href: safe.href, external: safe.external, c: parseInline(m[1]) });
      } else {
        text += m[1]; // unsafe scheme (javascript:, data:) — keep the label, drop the link
      }
      i += m[0].length;
    } else {
      text += src[i];
      i += 1;
    }
  }
  flush();
  return out;
}

export function inlineToText(nodes: Inline[]): string {
  return nodes.map((n) => (n.t === "text" || n.t === "code" ? n.v : inlineToText(n.c))).join("");
}

function headingId(text: string, used: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line))) {
      // The page template owns the single <h1>; "#" in a body renders as h2.
      const level = (Math.max(2, m[1].length) as 2 | 3 | 4);
      const c = parseInline(m[2]);
      const text = inlineToText(c);
      blocks.push({ t: "heading", level, id: headingId(text, used), c, text });
      i++;
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ t: "hr" });
      i++;
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^\s*[-*]\s+/, "")));
      blocks.push({ t: "ul", items });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^\s*\d+[.)]\s+/, "")));
      blocks.push({ t: "ol", items });
    } else if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) parts.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ t: "quote", c: parseInline(parts.join(" ")) });
    } else {
      const parts: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{1,4}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>\s?|\s*(-{3,}|\*{3,})\s*$)/.test(lines[i])
      ) {
        parts.push(lines[i++].trim());
      }
      blocks.push({ t: "p", c: parseInline(parts.join(" ")) });
    }
  }
  return blocks;
}

/** Table of contents entries (h2 only — h3/h4 are sub-points). */
export function extractHeadings(blocks: Block[]): { id: string; text: string }[] {
  return blocks.flatMap((b) => (b.t === "heading" && b.level === 2 ? [{ id: b.id, text: b.text }] : []));
}

/** Plain text of a Markdown body — for meta descriptions, word counts and JSON-LD answers. */
export function markdownToPlainText(source: string): string {
  const parts: string[] = [];
  for (const b of parseMarkdown(source)) {
    if (b.t === "heading" || b.t === "p" || b.t === "quote") parts.push(inlineToText(b.c));
    else if (b.t === "ul" || b.t === "ol") parts.push(b.items.map(inlineToText).join(" "));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
