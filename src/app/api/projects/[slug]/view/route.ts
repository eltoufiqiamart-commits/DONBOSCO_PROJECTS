import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new NextResponse(null, { status: 204 });
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return new NextResponse(null, { status: 204 });
  const supabase = createServiceSupabase();
  if (!supabase) return new NextResponse(null, { status: 204 });
  const cookieName = "dbc-project-visitor";
  const existing = request.cookies.get(cookieName)?.value;
  const visitorId = existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID();
  const salt = process.env.VIEW_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "don-bosco-projects-view-v1";
  const visitorHash = createHash("sha256").update(`${visitorId}:${salt}`).digest("hex");
  await supabase.rpc("record_project_view", { p_slug: slug, p_visitor_hash: visitorHash });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!existing) response.cookies.set(cookieName, visitorId, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
