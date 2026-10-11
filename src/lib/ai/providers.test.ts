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
    expect(() => readAiConfig({ AI_API_KEY: "k" })).toThrow();
    expect(readAiConfig({ AI_API_KEY: "k", AI_MODEL: "m" })).toMatchObject({ provider: "anthropic", model: "m", enabled: true });
  });
  it("can be switched off and swapped by env alone", () => {
    expect(readAiConfig({ AI_ENABLED: "false" }).enabled).toBe(false);
    expect(readAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k", AI_MODEL: "m" }).provider).toBe("openai");
    expect(() => readAiConfig({ AI_PROVIDER: "nope", AI_API_KEY: "k", AI_MODEL: "m" })).toThrow();
  });
});
