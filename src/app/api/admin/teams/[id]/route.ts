import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, logAdminActivity } from "@/lib/admin";
import { teamInputSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = teamInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_team", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc("admin_save_team", { p_payload: parsed.data, p_team_id: id });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "slug_conflict" : "save_failed" }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ id: data, saved: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: team, error: readError } = await auth.context.supabase.from("teams").select("id,slug,image_path").eq("id", id).maybeSingle();
  if (readError || !team) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await logAdminActivity(auth.context.supabase, auth.context.user.id, "team.deleted", "team", id, { slug: team.slug });
  const { error } = await auth.context.supabase.from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
