import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";
const editableKeys = ["home.hero_title", "home.hero_description", "home.industry_title", "home.industry_description", "home.final_title", "home.final_description"] as const;
const contentSchema = z.object({
  content: z.array(z.object({ key: z.enum(editableKeys), en: z.string().trim().min(1).max(2000), ar: z.string().trim().min(1).max(2000), it: z.string().trim().min(1).max(2000) })).max(12),
  statistics: z.object({ projects: z.boolean(), departments: z.boolean(), teams: z.boolean(), years: z.boolean() }).optional(),
});

export async function GET() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const [content, statistics] = await Promise.all([
    auth.context.supabase.from("site_content").select("key,content_en,content_ar,content_it,is_visible").in("key", [...editableKeys]).order("key"),
    auth.context.supabase.from("statistics_config").select("show_projects,show_departments,show_teams,show_years").eq("id", true).maybeSingle(),
  ]);
  if (content.error || statistics.error) return NextResponse.json({ error: "load_failed" }, { status: 503 });
  return NextResponse.json({ content: content.data ?? [], statistics: statistics.data ?? { show_projects: true, show_departments: true, show_teams: true, show_years: true } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  const content = parsed.data.content.map((row) => ({ key: row.key, en: row.en, ar: row.ar, it: row.it }));
  const { error } = await auth.context.supabase.rpc("admin_save_site_content", { p_content: content, p_statistics: parsed.data.statistics ?? null });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 400 });
  return NextResponse.json({ saved: true });
}
