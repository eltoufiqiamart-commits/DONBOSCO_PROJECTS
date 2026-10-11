import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { studentInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { data, error } = await auth.context.supabase.from("students").select("*").order("display_name_en");
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 503 });
  return NextResponse.json({ students: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = studentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_student", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc("admin_save_student", { p_payload: parsed.data, p_student_id: null });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 400 });
  return NextResponse.json({ id: data, saved: true }, { status: 201 });
}
