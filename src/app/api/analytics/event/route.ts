import { NextResponse, type NextRequest } from "next/server";
import { ingest } from "@/features/analytics/ingest";
import { firestoreAnalyticsStore, SHARDS } from "@/features/analytics/firestoreStore";
import { analyticsRateStore, clientIp, hashVisitorKey } from "@/features/ads/deps";
import { toHttp } from "@/lib/serviceHttp";

export const dynamic = "force-dynamic";

/** Public beacon endpoint (sendBeacon posts text/plain, so the body is parsed from text). Writes counters only. */
export async function POST(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text());
    const result = await ingest(
      { store: firestoreAnalyticsStore, rateStore: analyticsRateStore, now: () => new Date(), shard: () => Math.floor(Math.random() * SHARDS) },
      hashVisitorKey(clientIp(req.headers)),
      req.headers.get("user-agent"),
      body
    );
    return toHttp(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
