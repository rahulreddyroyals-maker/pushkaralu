import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { guarded } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { runScheduler } from "@/features/notifications/service";

/**
 * Scheduler entry point: delivers due scheduled notifications, resumes
 * interrupted ones and creates event reminders. Call it every minute or two
 * (Vercel Cron / Cloud Scheduler). It is NOT a user API: it needs
 * `Authorization: Bearer $CRON_SECRET`, and refuses to run at all if
 * CRON_SECRET isn't configured.
 */
function authorized(req: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request) {
  const ok = authorized(req);
  if (ok === null) return NextResponse.json({ error: "Scheduler is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return guarded(async () => NextResponse.json(await runScheduler(notificationDeps)));
}

export const GET = handle; // Vercel Cron issues GET
export const POST = handle;
