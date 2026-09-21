import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { monetizationSettingsInputSchema } from "@/features/settings/schemas";
import { getMonetizationSettings, updateMonetizationSettings } from "@/features/settings/api";
import { writeAuditLog } from "@/lib/audit/log";
import { STAFF_ROLES } from "@/types/roles";

/** GET — any staff can view the current rates (they affect reports they read). */
export async function GET() {
  const auth = await requireRole(STAFF_ROLES);
  if (auth.error) return auth.error;
  return NextResponse.json(await getMonetizationSettings());
}

/**
 * PATCH — SUPER_ADMIN only, deliberately stricter than the rest of the
 * admin surface and matching `match /settings/{key}` in
 * firestore.rules. Commission rates directly determine what providers
 * get paid, so this sits behind the highest bar the role system has.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireRole(["SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = monetizationSettingsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const previous = await getMonetizationSettings();
  await updateMonetizationSettings(parsed.data);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "MONETIZATION_SETTINGS_UPDATED",
    targetType: "settings",
    targetId: "monetization",
    metadata: { previous, next: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
