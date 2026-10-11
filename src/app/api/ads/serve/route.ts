import { NextResponse, type NextRequest } from "next/server";
import { serveAds } from "@/features/ads/serve";
import { adServeDeps } from "@/features/ads/deps";

// Public: returns only visitor-facing creative (headline, image, sponsor name) — never budgets, advertiser contacts or campaign status.
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const lang = p.get("lang") === "te" ? "te" : "en";
    const ads = await serveAds(adServeDeps(), p.get("placement") ?? "", lang);
    return NextResponse.json({ ads }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("[ads] serve failed", error);
    return NextResponse.json({ ads: [] }); // an ad failure must never break a page
  }
}
