import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("admin_get_overview");
  if (error || !data) return NextResponse.json({ error: "load_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
