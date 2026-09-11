import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { purohitInputSchema } from "@/features/purohits/schemas";
import { createPurohit } from "@/features/purohits/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = purohitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = await createPurohit(user.uid, parsed.data);
  await writeAuditLog({ actorUid: user.uid, action: "PUROHIT_APPLICATION_SUBMITTED", targetType: "purohit", targetId: id });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
