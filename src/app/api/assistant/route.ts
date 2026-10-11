import type { NextRequest } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { guarded, toHttp } from "@/lib/serviceHttp";
import { chat } from "@/features/assistant/service";
import { assistantDeps, hashVisitor } from "@/features/assistant/deps";

// Never cache: every reply depends on live platform data and the caller's rate-limit state.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Server-side only: the provider API key is read from the server environment here and never reaches the browser. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const user = await getServerUser().catch(() => null);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    return toHttp(await chat(assistantDeps(), user ? { uid: user.uid } : null, hashVisitor(ip), await req.json().catch(() => null)));
  });
}
