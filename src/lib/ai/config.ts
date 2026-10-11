import { AiConfigError } from "./types";

/** Groq-hosted model with tool calling. Override with AI_MODEL if Groq retires it. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export interface AiConfig {
  enabled: boolean;
  provider: "groq" | "anthropic" | "openai";
  model: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs: number;
}

/**
 * Reads provider settings from the server environment only. Keys are never
 * read in client code and never sent to the browser. The model id is
 * required (not defaulted) so a deploy can't silently run on a stale model.
 *
 *   AI_ENABLED     "false" turns the assistant off (kill switch)
 *   AI_PROVIDER    "groq" (default, free tier) | "anthropic" | "openai" (any OpenAI-compatible API)
 *   AI_MODEL       model id; for groq defaults to DEFAULT_GROQ_MODEL when unset
 *   AI_API_KEY     provider key (GROQ_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY also accepted)
 *   AI_BASE_URL    optional override (proxy, gateway, self-hosted)
 *   AI_TIMEOUT_MS  per-request timeout, default 30000
 */
export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const enabled = (env.AI_ENABLED ?? "true").toLowerCase() !== "false";
  const provider = (env.AI_PROVIDER ?? "groq").toLowerCase();
  if (provider !== "groq" && provider !== "anthropic" && provider !== "openai") throw new AiConfigError(`Unsupported AI_PROVIDER "${provider}"`);
  const apiKey = env.AI_API_KEY ?? (provider === "groq" ? env.GROQ_API_KEY : provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY) ?? "";
  const model = (env.AI_MODEL ?? "").trim() || (provider === "groq" ? DEFAULT_GROQ_MODEL : "");
  if (enabled && !apiKey) throw new AiConfigError("AI_API_KEY is not set");
  if (enabled && !model) throw new AiConfigError("AI_MODEL is not set");
  const timeout = Number(env.AI_TIMEOUT_MS);
  return {
    enabled,
    provider,
    model,
    apiKey,
    baseUrl: env.AI_BASE_URL?.trim() || (provider === "groq" ? GROQ_BASE_URL : undefined),
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? timeout : 30_000,
  };
}
