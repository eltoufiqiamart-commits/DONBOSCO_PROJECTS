import { NextResponse } from "next/server";
import { getAdminContext, logAdminActivity } from "@/lib/admin";

export async function POST() {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: uploads, error } = await auth.context.supabase.from("media_uploads").select("id,bucket_name,object_path").is("claimed_at", null).lt("created_at", cutoff).limit(100);
  if (error) return NextResponse.json({ error: "cleanup_failed" }, { status: 503 });
  let removed = 0;
  let retained = 0;
  for (const upload of uploads ?? []) {
    const { bucket_name: bucket, object_path: path } = upload;
    const refs = await Promise.all([
      bucket === "project-covers" ? auth.context.supabase.from("projects").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
      bucket === "project-gallery" || bucket === "approved-documents" ? auth.context.supabase.from("project_media").select("id", { count: "exact", head: true }).eq("bucket_name", bucket).eq("object_path", path) : Promise.resolve({ count: 0, error: null }),
      bucket === "department-images" ? auth.context.supabase.from("departments").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
      bucket === "team-images" ? auth.context.supabase.from("teams").select("id", { count: "exact", head: true }).eq("image_path", path) : Promise.resolve({ count: 0, error: null }),
    ]);
    if (refs.some((result) => result.error) || refs.some((result) => Number(result.count ?? 0) > 0)) { retained += 1; continue; }
    const { error: storageError } = await auth.context.supabase.storage.from(bucket).remove([path]);
    if (storageError) { retained += 1; continue; }
    const { error: registryError } = await auth.context.supabase.from("media_uploads").delete().eq("id", upload.id);
    if (registryError) { retained += 1; continue; }
    removed += 1;
  }
  await logAdminActivity(auth.context.supabase, auth.context.user.id, "media.cleanup", "media_upload", null, { removed, retained });
  return NextResponse.json({ removed, retained }, { headers: { "Cache-Control": "no-store" } });
}
