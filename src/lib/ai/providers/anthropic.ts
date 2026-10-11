import type { ChatMessage, GenerateRequest, GenerateResult, LlmProvider, ToolCall } from "../types";
import type { AiConfig } from "../config";
import { postJson } from "./http";

/** Neutral messages -> Anthropic Messages API shape. Consecutive tool results become ONE user message of tool_result blocks. */
export function toAnthropicMessages(messages: ChatMessage[]): unknown[] {
  const out: { role: "user" | "assistant"; content: unknown }[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const blocks: unknown[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const c of m.toolCalls ?? []) blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.arguments });
      out.push({ role: "assistant", content: blocks.length ? blocks : [{ type: "text", text: "" }] });
    } else {
      const block = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content };
      const last = out[out.length - 1];
      if (last && last.role === "user" && Array.isArray(last.content) && (last.content as { type?: string }[]).every((b) => b.type === "tool_result")) {
        (last.content as unknown[]).push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }
  return out;
}

interface AnthropicResponse {
  content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function fromAnthropicResponse(res: AnthropicResponse): GenerateResult {
  const blocks = res.content ?? [];
  const toolCalls: ToolCall[] = blocks
    .filter((b) => b.type === "tool_use" && b.id && b.name)
    .map((b) => ({ id: b.id as string, name: b.name as string, arguments: b.input ?? {} }));
  const stop = res.stop_reason;
  return {
    text: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim(),
    toolCalls,
    stopReason: toolCalls.length ? "tool_use" : stop === "end_turn" || stop === "stop_sequence" ? "end" : stop === "max_tokens" ? "length" : "other",
    usage: { inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens },
  };
}

export function createAnthropicProvider(config: AiConfig): LlmProvider {
  const base = (config.baseUrl ?? "https://api.anthropic.com").replace(/\/+$/, "");
  return {
    name: "anthropic",
    model: config.model,
    async generate(req: GenerateRequest) {
      const body = {
        model: config.model,
        max_tokens: req.maxTokens ?? 1200,
        temperature: req.temperature ?? 0.3,
        system: req.system,
        messages: toAnthropicMessages(req.messages),
        ...(req.tools?.length ? { tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}),
      };
      const res = await postJson(`${base}/v1/messages`, { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }, body, config.timeoutMs, req.signal);
      return fromAnthropicResponse(res as AnthropicResponse);
    },
  };
}
