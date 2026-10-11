import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

const IMAGE_ENTITIES = new Set(["project-cover", "project-gallery", "department", "team"]);

function badRequest() {
  return NextResponse.json({ error: "Media is not available." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const entity = params.get("entity") ?? "";
  const slug = params.get("slug") ?? "";
  const path = params.get("path") ?? "";
  const mediaId = params.get("media") ?? "";
  if (!IMAGE_ENTITIES.has(entity) || !slug || slug.length > 180 || (path && (path.length > 500 || path.includes("..") || path.includes("\\")))) return badRequest();
  const supabase = createServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "Media storage is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  let bucket = "";
  let objectPath = "";
  if (entity === "project-cover") {
    bucket = "project-covers";
    const { data, error } = await supabase.from("projects").select("cover_image_path").eq("slug", slug).eq("status", "published").eq("cover_image_path", path).maybeSingle();
    if (error || !data?.cover_image_path) return badRequest();
    objectPath = data.cover_image_path;
  } else if (entity === "project-gallery") {
    bucket = "project-gallery";
    if (!mediaId || mediaId.length > 80) return badRequest();
    const { data: media, error } = await supabase.from("project_media").select("id,project_id,object_path,bucket_name,kind,is_public_approved").eq("id", mediaId).maybeSingle();
    if (error || !media || media.bucket_name !== bucket || media.kind !== "image" || !media.is_public_approved || !media.object_path) return badRequest();
    const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", media.project_id).eq("slug", slug).eq("status", "published").maybeSingle();
    if (projectError || !project) return badRequest();
    objectPath = media.object_path;
  } else if (entity === "department") {
    bucket = "department-images";
    const { data, error } = await supabase.from("departments").select("cover_image_path").eq("slug", slug).eq("is_active", true).eq("cover_image_path", path).maybeSingle();
    if (error || !data?.cover_image_path) return badRequest();
    objectPath = data.cover_image_path;
  } else if (entity === "team") {
    bucket = "team-images";
    const { data, error } = await supabase.from("teams").select("image_path").eq("slug", slug).eq("status", "published").eq("is_public", true).eq("image_path", path).maybeSingle();
    if (error || !data?.image_path) return badRequest();
    objectPath = data.image_path;
  }

  const { data: signed, error: signingError } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600);
  if (signingError || !signed?.signedUrl) return badRequest();
  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
