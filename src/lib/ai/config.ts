import { AiConfigError } from "./types";

export interface AiConfig {
  enabled: boolean;
  provider: "anthropic" | "openai";
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
 *   AI_PROVIDER    "anthropic" (default) | "openai" (any OpenAI-compatible API)
 *   AI_MODEL       model id from your provider's console
 *   AI_API_KEY     provider key (ANTHROPIC_API_KEY / OPENAI_API_KEY also accepted)
 *   AI_BASE_URL    optional override (proxy, gateway, self-hosted)
 *   AI_TIMEOUT_MS  per-request timeout, default 30000
 */
export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const enabled = (env.AI_ENABLED ?? "true").toLowerCase() !== "false";
  const provider = (env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider !== "anthropic" && provider !== "openai") throw new AiConfigError(`Unsupported AI_PROVIDER "${provider}"`);
  const apiKey = env.AI_API_KEY ?? (provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY) ?? "";
  const model = (env.AI_MODEL ?? "").trim();
  if (enabled && !apiKey) throw new AiConfigError("AI_API_KEY is not set");
  if (enabled && !model) throw new AiConfigError("AI_MODEL is not set");
  const timeout = Number(env.AI_TIMEOUT_MS);
  return {
    enabled,
    provider,
    model,
    apiKey,
    baseUrl: env.AI_BASE_URL?.trim() || undefined,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? timeout : 30_000,
  };
}
