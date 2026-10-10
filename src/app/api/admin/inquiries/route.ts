import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { data, error } = await auth.context.supabase.from("inquiries").select("*, project:projects!inquiries_project_id_fkey(id,slug,title_en,title_ar,title_it)").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 503 });
  return NextResponse.json({ inquiries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
