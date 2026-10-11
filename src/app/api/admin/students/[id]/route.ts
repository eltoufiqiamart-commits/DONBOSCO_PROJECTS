import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, logAdminActivity } from "@/lib/admin";
import { studentInputSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = studentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_student" }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc("admin_save_student", { p_payload: parsed.data, p_student_id: id });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 400 });
  return NextResponse.json({ id: data, saved: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: student } = await auth.context.supabase.from("students").select("id").eq("id", id).maybeSingle();
  if (!student) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { error } = await auth.context.supabase.from("students").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 400 });
  await logAdminActivity(auth.context.supabase, auth.context.user.id, "student.deleted", "student", id);
  return NextResponse.json({ deleted: true });
}
