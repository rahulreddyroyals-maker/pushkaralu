import { describe, it, expect } from "vitest";
import { toAnthropicMessages, fromAnthropicResponse } from "./providers/anthropic";
import { toOpenAiMessages, fromOpenAiResponse } from "./providers/openai";
import { readAiConfig } from "./config";
import type { ChatMessage } from "./types";

const convo: ChatMessage[] = [
  { role: "user", content: "hotels near ghat" },
  { role: "assistant", content: "", toolCalls: [{ id: "t1", name: "search_hotels", arguments: { limit: 2 } }, { id: "t2", name: "search_ghats", arguments: {} }] },
  { role: "tool", toolCallId: "t1", name: "search_hotels", content: "{}" },
  { role: "tool", toolCallId: "t2", name: "search_ghats", content: "{}" },
];

describe("provider adapters", () => {
  it("anthropic: groups consecutive tool results into one user message", () => {
    const out = toAnthropicMessages(convo) as { role: string; content: { type: string }[] }[];
    expect(out.length).toBe(3);
    expect(out[1].content.map((b) => b.type)).toEqual(["tool_use", "tool_use"]);
    expect(out[2].role).toBe("user");
    expect(out[2].content.map((b) => b.type)).toEqual(["tool_result", "tool_result"]);
  });
  it("anthropic: parses text, tool calls and stop reason", () => {
    const r = fromAnthropicResponse({ content: [{ type: "text", text: "hi" }, { type: "tool_use", id: "x", name: "n", input: { a: 1 } }], stop_reason: "tool_use", usage: { input_tokens: 5, output_tokens: 7 } });
    expect(r.toolCalls).toEqual([{ id: "x", name: "n", arguments: { a: 1 } }]);
    expect(r.stopReason).toBe("tool_use");
    expect(r.usage).toEqual({ inputTokens: 5, outputTokens: 7 });
    expect(fromAnthropicResponse({ content: [{ type: "text", text: "done" }], stop_reason: "end_turn" }).stopReason).toBe("end");
  });
  it("openai: builds system + tool messages and parses arguments safely", () => {
    const out = toOpenAiMessages("SYS", convo) as { role: string }[];
    expect(out.map((m) => m.role)).toEqual(["system", "user", "assistant", "tool", "tool"]);
    const r = fromOpenAiResponse({ choices: [{ finish_reason: "tool_calls", message: { content: null, tool_calls: [{ id: "a", function: { name: "f", arguments: "{bad json" } }] } }] });
    expect(r.toolCalls[0].arguments).toEqual({});
    expect(r.stopReason).toBe("tool_use");
  });
});

describe("readAiConfig", () => {
  it("requires key and model when enabled", () => {
    expect(() => readAiConfig({})).toThrow();
    expect(() => readAiConfig({ AI_PROVIDER: "openai", AI_API_KEY: "k" })).toThrow(); // model has no default outside groq
    expect(readAiConfig({ AI_API_KEY: "k", AI_MODEL: "m" })).toMatchObject({ provider: "groq", model: "m", enabled: true });
    expect(readAiConfig({ GROQ_API_KEY: "g" })).toMatchObject({ provider: "groq", model: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" });
    expect(readAiConfig({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "a", AI_MODEL: "m" }).provider).toBe("anthropic");
  });
  it("can be switched off and swapped by env alone", () => {
    expect(readAiConfig({ AI_ENABLED: "false" }).enabled).toBe(false);
    expect(readAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k", AI_MODEL: "m" }).provider).toBe("openai");
    expect(() => readAiConfig({ AI_PROVIDER: "nope", AI_API_KEY: "k", AI_MODEL: "m" })).toThrow();
  });
});

describe("openai/groq provider resilience", () => {
  const cfg = { enabled: true, provider: "groq" as const, model: "old-model", apiKey: "k", baseUrl: "https://x.test/v1", timeoutMs: 5000 };
  const okBody = { choices: [{ finish_reason: "stop", message: { content: "hi" } }] };
  const req = { system: "s", messages: [{ role: "user" as const, content: "q" }], tools: [{ name: "t", description: "d", parameters: { type: "object" } }] };
  const mkFetch = (responses: Array<{ status: number; body: unknown }>) => {
    const bodies: Record<string, unknown>[] = [];
    const fn = async (_u: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      const r = responses.shift()!;
      return new Response(JSON.stringify(r.body), { status: r.status });
    };
    return { fn, bodies };
  };

  it("retries without tools on a tool_use_failed 400", async () => {
    const { createOpenAiProvider } = await import("./providers/openai");
    const { fn, bodies } = mkFetch([{ status: 400, body: { error: { code: "tool_use_failed", message: "bad tool call" } } }, { status: 200, body: okBody }]);
    const orig = globalThis.fetch;
    globalThis.fetch = fn as unknown as typeof fetch;
    try {
      const out = await createOpenAiProvider(cfg).generate(req);
      expect(out.text).toBe("hi");
      expect(bodies[0].tools).toBeDefined();
      expect(bodies[1].tools).toBeUndefined();
    } finally { globalThis.fetch = orig; }
  });

  it("falls back to a supported Groq model when the configured one is gone", async () => {
    const { createOpenAiProvider, GROQ_FALLBACK_MODEL } = await import("./providers/openai");
    const { fn, bodies } = mkFetch([{ status: 404, body: { error: { code: "model_not_found", message: "no such model" } } }, { status: 200, body: okBody }]);
    const orig = globalThis.fetch;
    globalThis.fetch = fn as unknown as typeof fetch;
    try {
      const out = await createOpenAiProvider(cfg).generate(req);
      expect(out.text).toBe("hi");
      expect(bodies[1].model).toBe(GROQ_FALLBACK_MODEL);
    } finally { globalThis.fetch = orig; }
  });

  it("surfaces 401 as a provider error with detail (no retry)", async () => {
    const { createOpenAiProvider } = await import("./providers/openai");
    const { fn } = mkFetch([{ status: 401, body: { error: { code: "invalid_api_key", message: "Invalid API Key" } } }]);
    const orig = globalThis.fetch;
    globalThis.fetch = fn as unknown as typeof fetch;
    try {
      await expect(createOpenAiProvider(cfg).generate(req)).rejects.toMatchObject({ status: 401, detail: expect.stringContaining("invalid_api_key") });
    } finally { globalThis.fetch = orig; }
  });
});
