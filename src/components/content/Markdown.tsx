import Link from "next/link";
import type { ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/content/markdown";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "code":
        return <code key={i} className="rounded bg-river-mist px-1 py-0.5 text-[0.9em]">{n.v}</code>;
      case "link":
        return n.external ? (
          <a key={i} href={n.href} className="text-river-deep underline" {...(n.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {renderInline(n.c)}
          </a>
        ) : (
          <Link key={i} href={n.href} className="text-river-deep underline">{renderInline(n.c)}</Link>
        );
    }
  });
}

function renderBlock(b: Block, i: number): ReactNode {
  switch (b.t) {
    case "heading": {
      const cls = b.level === 2 ? "mt-8 text-xl font-semibold text-ink" : "mt-6 text-lg font-semibold text-ink";
      const Tag = (b.level === 2 ? "h2" : b.level === 3 ? "h3" : "h4") as "h2" | "h3" | "h4";
      return <Tag key={i} id={b.id} className={`${cls} scroll-mt-24`}>{renderInline(b.c)}</Tag>;
    }
    case "p":
      return <p key={i} className="mt-4 leading-7 text-ink">{renderInline(b.c)}</p>;
    case "ul":
      return <ul key={i} className="mt-4 list-disc space-y-1 pl-6 text-ink">{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
    case "ol":
      return <ol key={i} className="mt-4 list-decimal space-y-1 pl-6 text-ink">{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ol>;
    case "quote":
      return <blockquote key={i} className="mt-4 border-l-4 border-saffron pl-4 text-ink-muted">{renderInline(b.c)}</blockquote>;
    case "hr":
      return <hr key={i} className="my-8 border-border" />;
  }
}

/** Server component: Markdown source -> React elements. No raw HTML is ever emitted. */
export function Markdown({ source }: { source: string }) {
  return <div>{parseMarkdown(source).map(renderBlock)}</div>;
}
