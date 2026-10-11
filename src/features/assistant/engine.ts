import type { ChatMessage, LlmProvider, ToolCall } from "@/lib/ai/types";
import { detectLang } from "./lang";
import { buildSystemPrompt } from "./prompt";
import { runTool, TOOL_SPECS, type ToolContext } from "./tools";
import { GUARD_NOTICE, guardText } from "./guard";
import { splitCitations, stripCitations } from "./citations";
import { EMERGENCY_TEXT, isEmergencyMessage } from "./emergency";
import type { AssistantData, AssistantReply, Lang, VerifiedItem } from "./types";

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface EngineInput {
  provider: LlmProvider;
  data: AssistantData;
  turns: ChatTurn[];
  uiLang?: Lang;
  now?: Date;
  /** Model round-trips (each may call several tools) before the engine forces a final answer. */
  maxRounds?: number;
  maxToolCalls?: number;
  signal?: AbortSignal;
}

export interface EngineResult extends AssistantReply {
  meta: { toolNames: string[]; rounds: number; removed: number; inputTokens?: number; outputTokens?: number };
}

const FALLBACK: Record<Lang, string> = {
  en: "I couldn't put together a reliable answer to that. The verified records I found (if any) are listed below — please check them, or browse the site directly.",
  te: "దీనికి నమ్మదగిన సమాధానం ఇవ్వలేకపోయాను. నాకు దొరికిన ధృవీకరించిన వివరాలు (ఉంటే) క్రింద ఉన్నాయి — దయచేసి వాటిని చూడండి లేదా సైట్‌లో నేరుగా చూడండి.",
};

export async function runAssistant(input: EngineInput): Promise<EngineResult> {
  const now = input.now ?? new Date();
  const lastUser = [...input.turns].reverse().find((t) => t.role === "user")?.content ?? "";
  const lang = detectLang(lastUser, input.uiLang ?? "en");
  const ctx: ToolContext = { data: input.data, lang, now };

  if (isEmergencyMessage(lastUser)) return emergencyReply(ctx, lang);

  const maxRounds = input.maxRounds ?? 4;
  const maxCalls = input.maxToolCalls ?? 8;
  const convo: ChatMessage[] = input.turns.map((t) => ({ role: t.role, content: t.content }));
  const system = buildSystemPrompt(lang, now);
  const verified = new Map<string, VerifiedItem>();
  const toolNames: string[] = [];
  let calls = 0;
  let text = "";
  let rounds = 0;
  let inTok = 0;
  let outTok = 0;

  for (; rounds < maxRounds; rounds++) {
    const last = rounds === maxRounds - 1;
    const res = await input.provider.generate({ system, messages: convo, tools: last ? undefined : TOOL_SPECS, signal: input.signal });
    inTok += res.usage?.inputTokens ?? 0;
    outTok += res.usage?.outputTokens ?? 0;
    if (res.toolCalls.length === 0 || last) {
      text = res.text;
      rounds++;
      break;
    }
    const batch: ToolCall[] = res.toolCalls.slice(0, Math.max(0, maxCalls - calls));
    convo.push({ role: "assistant", content: res.text, toolCalls: res.toolCalls });
    // Every requested call needs a result message or providers reject the next turn; over-budget calls get a refusal.
    for (const call of res.toolCalls) {
      if (!batch.includes(call)) {
        convo.push({ role: "tool", toolCallId: call.id, name: call.name, content: JSON.stringify({ error: "Tool call limit reached. Answer with what you have." }) });
        continue;
      }
      calls++;
      toolNames.push(call.name);
      const out = await runTool(call.name, call.arguments, ctx);
      for (const it of out.items) if (!verified.has(it.ref)) verified.set(it.ref, it);
      convo.push({ role: "tool", toolCallId: call.id, name: call.name, content: out.content });
    }
  }

  const items = [...verified.values()];
  const guarded = guardText(text, items);
  const notices: string[] = [];
  let guidance = guarded.text;
  if (guarded.removed.length) notices.push(GUARD_NOTICE[lang]);
  const meaningful = stripCitations(guidance).replace(/\s+/g, "");
  if (meaningful.length < 20 && (guarded.removed.length > 0 || !text.trim())) guidance = FALLBACK[lang];
  // Drop citation markers that don't match a real retrieved record.
  guidance = splitCitations(guidance, items).map((s) => (s.type === "text" ? s.value : `[[${s.item.ref}]]`)).join("");

  return { guidance, verified: items, lang, notices, meta: { toolNames, rounds, removed: guarded.removed.length, inputTokens: inTok || undefined, outputTokens: outTok || undefined } };
}

async function emergencyReply(ctx: ToolContext, lang: Lang): Promise<EngineResult> {
  const out = await runTool("get_emergency_contacts", { limit: 6 }, ctx);
  const copy = EMERGENCY_TEXT[lang];
  return {
    guidance: `${out.items.length ? copy.withContacts : copy.without}\n\n${copy.missing}`,
    verified: out.items,
    lang,
    notices: [],
    safetyResponse: true,
    meta: { toolNames: ["get_emergency_contacts"], rounds: 0, removed: 0 },
  };
}
