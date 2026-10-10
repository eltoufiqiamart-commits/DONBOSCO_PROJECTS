import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, logAdminActivity } from "@/lib/admin";

const statusSchema = z.object({ status: z.enum(["new", "read", "responded", "archived"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  const { error } = await auth.context.supabase.from("inquiries").update({ status: parsed.data.status }).eq("id", id);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 400 });
  await logAdminActivity(auth.context.supabase, auth.context.user.id, "inquiry.status_updated", "inquiry", id, { status: parsed.data.status });
  return NextResponse.json({ saved: true });
}
