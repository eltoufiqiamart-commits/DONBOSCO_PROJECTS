import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";

const inquirySchema = z.object({
  organization: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  category: z.enum(["general", "project", "applied"]),
  projectSlug: z.string().trim().max(180).nullable().optional(),
  message: z.string().trim().min(20).max(5000),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return NextResponse.json({ error: "invalid_request" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ received: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = createServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

  let projectId: string | null = null;
  if (parsed.data.projectSlug) {
    const { data: project, error } = await supabase.from("projects").select("id").eq("slug", parsed.data.projectSlug).eq("status", "published").maybeSingle();
    if (error || !project) return NextResponse.json({ error: "invalid_project" }, { status: 400 });
    projectId = project.id;
  }
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip") || forwardedFor || "unknown";
  const rateSalt = process.env.INQUIRY_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "don-bosco-inquiry-v1";
  const ipHash = createHash("sha256").update(`${ip}:${rateSalt}`).digest("hex");
  const { error } = await supabase.rpc("submit_public_inquiry", {
    p_organization: parsed.data.organization,
    p_contact_name: parsed.data.contactName,
    p_email: parsed.data.email,
    p_category: parsed.data.category,
    p_project_id: projectId,
    p_message: parsed.data.message,
    p_ip_hash: ipHash,
  });
  if (error?.message?.includes("rate_limited")) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (error) return NextResponse.json({ error: "submission_failed" }, { status: 500 });
  return NextResponse.json({ received: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
