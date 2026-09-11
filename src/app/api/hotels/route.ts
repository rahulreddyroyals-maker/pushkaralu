import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { hotelInputSchema } from "@/features/hotels/schemas";
import { createHotel } from "@/features/hotels/api";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Any signed-in user can create a hotel listing — this IS the "become a
 * provider" application (spec Module 20 / "register-business" flow), not
 * a privileged action. It always starts PENDING (see createHotel) and
 * grants no role by itself — only admin approval does that (see
 * /api/admin/hotels/[id]/approval).
 */
export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = hotelInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = await createHotel(user.uid, parsed.data);
  await writeAuditLog({
    actorUid: user.uid,
    action: "HOTEL_APPLICATION_SUBMITTED",
    targetType: "hotel",
    targetId: id,
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
