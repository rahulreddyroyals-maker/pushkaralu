import type { ChatMessage, GenerateRequest, GenerateResult, LlmProvider, ToolCall } from "../types";
import { DEFAULT_GROQ_MODEL, type AiConfig } from "../config";
import { postJson } from "./http";
import { AiProviderError } from "../types";

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

/** Groq retires models from time to time; this still-supported small model keeps the assistant answering if AI_MODEL goes stale. */
export const GROQ_FALLBACK_MODEL = "openai/gpt-oss-20b";

export function createOpenAiProvider(config: AiConfig): LlmProvider {
  const base = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");

  async function call(req: GenerateRequest, model: string, withTools: boolean): Promise<GenerateResult> {
    const body = {
      model,
      max_tokens: Math.max(req.maxTokens ?? 1200, model.startsWith("openai/gpt-oss") ? 2000 : 0),
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}), // reasoning tokens count against max_tokens; keep them small
      temperature: req.temperature ?? 0.3,
      messages: toOpenAiMessages(req.system, req.messages),
      ...(withTools && req.tools?.length ? { tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: "auto" } : {}),
    };
    const res = await postJson(`${base}/chat/completions`, { authorization: `Bearer ${config.apiKey}` }, body, config.timeoutMs, req.signal);
    return fromOpenAiResponse(res as OpenAiResponse);
  }

  return {
    name: config.provider,
    model: config.model,
    async generate(req: GenerateRequest) {
      const hasTools = Boolean(req.tools?.length);
      try {
        return await call(req, config.model, true);
      } catch (error) {
        if (!(error instanceof AiProviderError)) throw error;
        // Small open models occasionally emit a malformed tool call (HTTP 400 tool_use_failed): retry the turn once without tools.
        if (error.status === 400 && hasTools && /tool/i.test(error.detail ?? "")) {
          console.warn("[assistant] tool call rejected by provider, retrying without tools:", error.detail);
          return await call(req, config.model, false);
        }
        // Retired / unknown model on Groq: fall back once instead of taking the assistant down.
        if (config.provider === "groq" && config.model !== GROQ_FALLBACK_MODEL && (error.status === 404 || (error.status === 400 && /model/i.test(error.detail ?? "")))) {
          console.warn(`[assistant] model "${config.model}" unavailable (${error.detail ?? error.status}); falling back to ${GROQ_FALLBACK_MODEL}`);
          // A stale AI_MODEL in the host env must not break the assistant: try the current default, then the small fallback.
          for (const m of [DEFAULT_GROQ_MODEL, GROQ_FALLBACK_MODEL].filter((x) => x !== config.model)) {
            try {
              return await call(req, m, hasTools);
            } catch (e2) {
              if (!(e2 instanceof AiProviderError) || (e2.status !== 404 && e2.status !== 400)) throw e2;
            }
          }
        }
        throw error;
      }
    },
  };
}
