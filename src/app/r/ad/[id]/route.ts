import { NextResponse, type NextRequest } from "next/server";
import { registerClick } from "@/features/ads/serve";
import { adServeDeps, clientIp, hashVisitorKey } from "@/features/ads/deps";
import { campaignTarget } from "@/features/ads/select";
import { isBot } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

/**
 * Counted click-through. The destination is read from the STORED campaign,
 * never from the URL, so this can't be used as an open redirect.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let target: string | null = null;
  try {
    const deps = adServeDeps();
    if (isBot(req.headers.get("user-agent"))) {
      const campaign = await deps.data.campaignById(id); // crawlers follow the link but are never counted
      target = campaign ? campaignTarget(campaign) : null;
    } else {
      target = (await registerClick(deps, hashVisitorKey(clientIp(req.headers)), id, req.nextUrl.searchParams.get("p") ?? "")).target;
    }
  } catch (error) {
    console.error("[ads] click failed", error);
  }
  const res = NextResponse.redirect(target ? new URL(target, req.url) : new URL("/", req.url), 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
