import type { LlmProvider } from "@/lib/ai/types";
import { AiConfigError, AiProviderError } from "@/lib/ai/types";
import { AI_LIMITS } from "@/config/app";
import { fail, ok, type ServiceResult } from "@/lib/serviceResult";
import { chatRequestSchema } from "./schemas";
import { runAssistant } from "./engine";
import { checkRate, type RateStore } from "./rateLimit";
import type { AssistantData, AssistantReply } from "./types";

export interface ChatActor { uid: string }

export interface AssistantDeps {
  enabled: () => boolean;
  provider: () => LlmProvider;
  data: AssistantData;
  rateStore: RateStore;
  /** Opaque per-visitor key (hashed IP) used for anonymous limits — never the raw address. */
  now: () => Date;
  /** Metadata-only usage log. Message text is deliberately NOT recorded. */
  log: (entry: Record<string, unknown>) => Promise<void>;
}

export type ChatResponse = AssistantReply & { remaining: number };

const UNAVAILABLE = "The assistant is temporarily unavailable. You can still browse ghats, hotels, temples and transport from the menu.";

export async function chat(deps: AssistantDeps, actor: ChatActor | null, visitorKey: string, body: unknown): Promise<ServiceResult<ChatResponse>> {
  if (!deps.enabled()) return fail(503, UNAVAILABLE);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());

  const now = deps.now();
  const limit = actor ? AI_LIMITS.signedInPerHour : AI_LIMITS.anonymousPerHour;
  const key = actor ? `u:${actor.uid}` : `v:${visitorKey}`;
  const decision = await checkRate(deps.rateStore, key, limit, 3_600_000, now.getTime());
  if (!decision.allowed) {
    return fail(429, `You've reached the hourly limit for the assistant. Please try again in about ${Math.ceil(decision.retryAfterSeconds / 60)} minutes${actor ? "" : ", or sign in for a higher limit"}.`, { retryAfterSeconds: decision.retryAfterSeconds });
  }

  const started = Date.now();
  try {
    const provider = deps.provider();
    const result = await runAssistant({
      provider, data: deps.data, turns: parsed.data.messages, uiLang: parsed.data.lang, now,
      maxRounds: AI_LIMITS.maxToolRounds, maxToolCalls: AI_LIMITS.maxToolCalls,
    });
    void deps.log({
      actor: actor?.uid ?? null, visitor: actor ? null : visitorKey, provider: provider.name, model: provider.model, lang: result.lang,
      tools: result.meta.toolNames, rounds: result.meta.rounds, verifiedItems: result.verified.length, removedSentences: result.meta.removed,
      safetyResponse: result.safetyResponse ?? false, inputTokens: result.meta.inputTokens ?? null, outputTokens: result.meta.outputTokens ?? null, latencyMs: Date.now() - started,
    }).catch((e) => console.error("[assistant] log failed", e));
    const reply = { ...result } as Omit<typeof result, "meta"> & { meta?: unknown };
    delete reply.meta; // internal diagnostics are logged above, never returned to the client
    return ok({ ...reply, remaining: decision.remaining });
  } catch (error) {
    let reason = "unexpected";
    if (error instanceof AiConfigError) { reason = "not_configured"; console.error("[assistant] misconfigured:", error.message); }
    else if (error instanceof AiProviderError) { reason = `provider_${error.status ?? "unreachable"}`; console.error("[assistant] provider error:", error.message, error.status ?? ""); }
    else console.error("[assistant] unexpected error", error);
    return fail(503, UNAVAILABLE, { reason }); // reason code only: no keys, prompts or provider bodies
  }
}
