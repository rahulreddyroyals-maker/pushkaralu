"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/clientApi";
import { parseInline } from "@/lib/content/markdown";
import { renderInline } from "@/components/content/Markdown";
import { splitCitations, stripCitations } from "../citations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AssistantReply, Lang, VerifiedItem } from "../types";

type ChatResponse = AssistantReply & { remaining: number };
type Msg = { role: "user"; content: string } | { role: "assistant"; reply: AssistantReply };

const UI = {
  en: {
    title: "Pushkaralu Assistant", sub: "Ask about ghats, temples, hotels, purohits, transport and trip plans.",
    placeholder: "Ask a question…", send: "Send", thinking: "Looking up verified data…", newChat: "New chat",
    verified: "Verified platform data", verifiedHint: "Records retrieved from the platform for this answer.",
    guidance: "AI guidance", guidanceHint: "Written by AI. General advice may be imperfect; figures and status come from the verified data, not from the AI.",
    asOf: "as of", open: "Open", emergency: "Emergency answer — contacts come from the verified directory.",
    disclaimer: "The assistant can't book, confirm room availability, or send help. Crowd and status data is entered manually by staff.",
    examples: ["I am coming from Hyderabad for two days.", "I have elderly parents — what should I plan?", "Find a hotel near this ghat.", "Which temples can I visit in one day?"],
    error: "Something went wrong.",
  },
  te: {
    title: "పుష్కరాలు అసిస్టెంట్", sub: "ఘాట్లు, ఆలయాలు, హోటళ్లు, పురోహితులు, రవాణా, ప్రయాణ ప్రణాళికల గురించి అడగండి.",
    placeholder: "మీ ప్రశ్న రాయండి…", send: "పంపండి", thinking: "ధృవీకరించిన డేటా చూస్తున్నాను…", newChat: "కొత్త చాట్",
    verified: "ధృవీకరించిన ప్లాట్‌ఫాం డేటా", verifiedHint: "ఈ సమాధానం కోసం ప్లాట్‌ఫాం నుండి తీసిన వివరాలు.",
    guidance: "AI సూచన", guidanceHint: "AI రాసినది. సాధారణ సలహాలు పూర్తిగా సరైనవి కాకపోవచ్చు; గణాంకాలు, స్థితి ధృవీకరించిన డేటా నుండే వస్తాయి, AI నుండి కాదు.",
    asOf: "నాటికి", open: "తెరవండి", emergency: "అత్యవసర సమాధానం — నంబర్లు ధృవీకరించిన డైరెక్టరీ నుండి.",
    disclaimer: "అసిస్టెంట్ బుక్ చేయలేదు, గదుల లభ్యతను నిర్ధారించలేదు, సహాయం పంపలేదు. రద్దీ, స్థితి వివరాలను సిబ్బంది చేతితో నమోదు చేస్తారు.",
    examples: ["నేను హైదరాబాద్ నుండి రెండు రోజులకు వస్తున్నాను.", "నాతో వృద్ధ తల్లిదండ్రులు ఉన్నారు — ఎలా ప్లాన్ చేయాలి?", "ఈ ఘాట్ దగ్గర హోటల్ చూపించండి.", "ఒక రోజులో ఏ ఆలయాలు చూడవచ్చు?"],
    error: "ఏదో తప్పు జరిగింది.",
  },
} as const;

function Guidance({ text, items }: { text: string; items: VerifiedItem[] }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const renderLine = (line: string) =>
    splitCitations(line, items).map((seg, i) =>
      seg.type === "ref" ? (
        <Link key={i} href={seg.item.href} className="mx-0.5 inline-block rounded-full border border-river-deep px-2 py-0.5 text-xs text-river-deep hover:bg-river-mist">{seg.item.title}</Link>
      ) : (
        <span key={i}>{renderInline(parseInline(seg.value))}</span>
      )
    );
  return (
    <div className="space-y-2 text-sm leading-6 text-ink">
      {lines.map((l, i) => (/^\s*[-*•]\s+/.test(l) ? <p key={i} className="pl-4 -indent-3">• {renderLine(l.replace(/^\s*[-*•]\s+/, ""))}</p> : <p key={i}>{renderLine(l)}</p>))}
    </div>
  );
}

function VerifiedCards({ items, t }: { items: VerifiedItem[]; t: (typeof UI)[Lang] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={t.verified} className="mt-3 rounded-[var(--radius-card)] border border-border bg-river-mist p-3">
      <h3 className="text-sm font-semibold text-ink">✔ {t.verified}</h3>
      <p className="text-xs text-ink-muted">{t.verifiedHint}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.ref} className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
            <Link href={it.href} className="font-semibold text-river-deep hover:underline">{it.title}</Link>
            <dl className="mt-1 space-y-0.5 text-xs text-ink-muted">
              {it.facts.map((f) => (
                <div key={f.label}><dt className="inline font-medium text-ink">{f.label}: </dt><dd className="inline">{f.value}</dd></div>
              ))}
            </dl>
            {it.note && <p className="mt-1 text-xs text-amber-700">{it.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssistantChat({ initialLang }: { initialLang?: Lang }) {
  const site = useLocale().lang;
  const [lang, setLang] = useState<Lang>(initialLang ?? site);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const t = UI[lang];

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...msgs, { role: "user", content } as Msg];
    setMsgs(history);
    setInput("");
    setError(null);
    setBusy(true);
    const payload = history.map((m) => (m.role === "user" ? { role: "user", content: m.content } : { role: "assistant", content: stripCitations(m.reply.guidance).slice(0, 1400) }));
    const res = await api<ChatResponse>("/api/assistant", "POST", { messages: payload.slice(-10), lang });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setMsgs([...history, { role: "assistant", reply: res.data }]);
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Language" className="inline-flex overflow-hidden rounded-lg border border-border text-sm">
            {(["en", "te"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`px-3 py-1.5 ${lang === l ? "bg-river-deep text-white" : "text-ink hover:bg-river-mist"}`}>{l === "en" ? "EN" : "తెలుగు"}</button>
            ))}
          </div>
          {msgs.length > 0 && <button type="button" onClick={() => { setMsgs([]); setError(null); }} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-river-mist">{t.newChat}</button>}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {t.examples.map((ex) => (
              <button key={ex} type="button" onClick={() => send(ex)} className="rounded-full border border-border px-3 py-1.5 text-sm text-ink hover:bg-river-mist">{ex}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="self-end max-w-[85%] rounded-2xl bg-river-deep px-4 py-2 text-sm text-white">{m.content}</div>
          ) : (
            <div key={i} className="max-w-full">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-raised p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted" title={t.guidanceHint}>🤖 {t.guidance}</p>
                {m.reply.safetyResponse && <p className="mb-2 text-xs font-medium text-red-700">{t.emergency}</p>}
                <Guidance text={m.reply.guidance} items={m.reply.verified} />
                {m.reply.notices.map((n) => <p key={n} className="mt-2 text-xs text-amber-700">{n}</p>)}
                <p className="mt-2 text-xs text-ink-muted">{t.guidanceHint}</p>
              </div>
              <VerifiedCards items={m.reply.verified} t={t} />
            </div>
          )
        )}
        {busy && <p role="status" className="text-sm text-ink-muted">{t.thinking}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-0 mt-6 flex gap-2 bg-surface pb-3 pt-2">
        <label htmlFor="assistant-input" className="sr-only">{t.placeholder}</label>
        <textarea
          id="assistant-input" value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={1500} placeholder={t.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          className="flex-1 resize-none rounded-lg border border-border bg-surface-raised p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-river-deep"
        />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-river-deep px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{t.send}</button>
      </form>
      <p className="mt-2 text-xs text-ink-muted">{t.disclaimer}</p>
    </div>
  );
}
