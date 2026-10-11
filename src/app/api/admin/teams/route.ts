import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { teamInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const [teams, students, departments] = await Promise.all([
    auth.context.supabase.from("teams").select("*, department:departments!teams_department_id_fkey(id,slug,name_en,name_ar,name_it), team_members(student:students!team_members_student_id_fkey(id,display_name_en,display_name_ar,display_name_it,is_public_profile))").order("created_at", { ascending: false }),
    auth.context.supabase.from("students").select("id,display_name_en,display_name_ar,display_name_it,bio_en,bio_ar,bio_it,is_public_profile,profile_image_path").order("display_name_en"),
    auth.context.supabase.from("departments").select("id,slug,name_en,name_ar,name_it").order("display_order"),
  ]);
  if (teams.error || students.error || departments.error) return NextResponse.json({ error: "load_failed" }, { status: 503 });
  return NextResponse.json({ teams: teams.data ?? [], students: students.data ?? [], departments: departments.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = teamInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_team", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc("admin_save_team", { p_payload: parsed.data, p_team_id: null });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "slug_conflict" : "save_failed" }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ id: data, saved: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
