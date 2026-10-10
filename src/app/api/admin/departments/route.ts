import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { data, error } = await auth.context.supabase.from("departments").select("*").order("display_order");
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 503 });
  return NextResponse.json({ departments: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
