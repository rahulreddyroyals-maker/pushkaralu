import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/types/roles";
import { readAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/providers";
import { AiConfigError, AiProviderError } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

/**
 * Assistant health check.
 *  GET /api/assistant/status          -> configuration only (no secrets): provider, model, whether a key is set.
 *  GET /api/assistant/status?probe=1  -> ADMIN/SUPER_ADMIN only: makes one tiny real call to the provider and reports the result.
 */
export async function GET(req: NextRequest) {
  let config;
  try {
    config = readAiConfig();
  } catch (e) {
    const message = e instanceof AiConfigError ? e.message : "Invalid AI configuration";
    return NextResponse.json({ ok: false, configured: false, problem: message, fix: "Set AI_PROVIDER=groq and GROQ_API_KEY in Vercel environment variables, then redeploy." }, { status: 200 });
  }
  const base = { configured: true, enabled: config.enabled, provider: config.provider, model: config.model, keyPresent: Boolean(config.apiKey) };
  if (req.nextUrl.searchParams.get("probe") !== "1") return NextResponse.json({ ok: config.enabled, ...base });

  const user = await getServerUser().catch(() => null);
  if (!user || !hasAnyRole(user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Probe is for administrators only" }, { status: 403 });

  const started = Date.now();
  try {
    const res = await createProvider(config).generate({ system: "Reply with the single word OK.", messages: [{ role: "user", content: "ping" }], maxTokens: 8, temperature: 0 });
    return NextResponse.json({ ok: true, ...base, reply: res.text.slice(0, 40), latencyMs: Date.now() - started });
  } catch (e) {
    const status = e instanceof AiProviderError ? e.status ?? null : null;
    const hint = status === 401 || status === 403 ? "The API key was rejected: create a new key at console.groq.com and update GROQ_API_KEY." : status === 404 ? "Model not found: set AI_MODEL to a current Groq model id." : status === 429 ? "Groq rate limit reached; wait and retry." : "Provider unreachable or erroring.";
    return NextResponse.json({ ok: false, ...base, providerStatus: status, providerDetail: e instanceof AiProviderError ? e.detail ?? null : null, hint, latencyMs: Date.now() - started });
  }
}
