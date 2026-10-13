import { AiProviderError } from "../types";

/** fetch with a timeout and a sanitized error: provider response bodies can echo prompts, so only the status is surfaced. */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: controller.signal });
    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: { code?: string; message?: string; type?: string } };
        detail = [j.error?.code ?? j.error?.type, j.error?.message].filter(Boolean).join(": ").slice(0, 240);
      } catch {
        /* body not JSON */
      }
      throw new AiProviderError(`Provider returned ${res.status}${detail ? ` (${detail})` : ""}`, res.status, detail);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError(controller.signal.aborted ? "Provider request timed out" : "Provider request failed");
  } finally {
    clearTimeout(timer);
  }
}
