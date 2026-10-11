import type { ChatMessage, GenerateRequest, GenerateResult, LlmProvider, ToolCall } from "../types";
import type { AiConfig } from "../config";
import { postJson } from "./http";

/** Neutral messages -> OpenAI-compatible chat.completions shape. */
export function toOpenAiMessages(system: string, messages: ChatMessage[]): unknown[] {
  const out: unknown[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.content });
    else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content || null,
        ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.arguments) } })) } : {}),
      });
    } else out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
  }
  return out;
}

interface OpenAiResponse {
  choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function safeParse(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function fromOpenAiResponse(res: OpenAiResponse): GenerateResult {
  const choice = res.choices?.[0];
  const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function.name, arguments: safeParse(c.function.arguments) }));
  const fr = choice?.finish_reason;
  return {
    text: (choice?.message?.content ?? "").trim(),
    toolCalls,
    stopReason: toolCalls.length ? "tool_use" : fr === "stop" ? "end" : fr === "length" ? "length" : "other",
    usage: { inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens },
  };
}

export function createOpenAiProvider(config: AiConfig): LlmProvider {
  const base = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  return {
    name: "openai",
    model: config.model,
    async generate(req: GenerateRequest) {
      const body = {
        model: config.model,
        max_tokens: req.maxTokens ?? 1200,
        temperature: req.temperature ?? 0.3,
        messages: toOpenAiMessages(req.system, req.messages),
        ...(req.tools?.length ? { tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
      };
      const res = await postJson(`${base}/chat/completions`, { authorization: `Bearer ${config.apiKey}` }, body, config.timeoutMs, req.signal);
      return fromOpenAiResponse(res as OpenAiResponse);
    },
  };
}
