import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

const buckets = new Set(["project-covers", "project-gallery", "department-images", "team-images", "approved-documents"]);

export async function POST(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const bucket = typeof values.bucket === "string" ? values.bucket : "";
  const path = typeof values.path === "string" ? values.path : "";
  if (!buckets.has(bucket) || !path.startsWith(`${auth.context.user.id}/`) || path.includes("..") || path.length > 500) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const supabase = auth.context.supabase;
  const refs = await Promise.all([
    bucket === "project-covers" ? supabase.from("projects").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "project-gallery" || bucket === "approved-documents" ? supabase.from("project_media").select("id", { count: "exact", head: true }).eq("bucket_name", bucket).eq("object_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "department-images" ? supabase.from("departments").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "team-images" ? supabase.from("teams").select("id", { count: "exact", head: true }).eq("image_path", path) : Promise.resolve({ count: 0, error: null }),
  ]);
  if (refs.some((result) => result.error)) return NextResponse.json({ error: "reference_check_failed" }, { status: 503 });
  if (refs.some((result) => Number(result.count ?? 0) > 0)) return NextResponse.json({ removed: false, retained: true });
  const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
  if (storageError) return NextResponse.json({ error: "cleanup_failed" }, { status: 503 });
  const { error: registryError } = await supabase.from("media_uploads").delete().eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", auth.context.user.id);
  if (registryError) return NextResponse.json({ error: "cleanup_failed" }, { status: 503 });
  return NextResponse.json({ removed: true, retained: false });
}
