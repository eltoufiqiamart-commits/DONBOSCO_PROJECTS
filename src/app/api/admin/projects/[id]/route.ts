import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, logAdminActivity } from "@/lib/admin";
import { projectInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await auth.context.supabase.rpc("admin_get_project", { p_project_id: id });
  if (error || !data || typeof data !== "object") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = data as Record<string, unknown>;
  const tags = Array.isArray(row.project_tags) ? row.project_tags.map((item) => (item as { tags?: unknown }).tags).filter(Boolean) : [];
  const categories = Array.isArray(row.project_categories) ? row.project_categories.map((item) => (item as { categories?: unknown }).categories).filter(Boolean) : [];
  return NextResponse.json({ project: { ...row, tags, categories } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const statusActions: Record<string, string> = {
    publish: "published", approve: "published", unpublish: "draft", request_revision: "pending", reject: "rejected", archive: "archived", restore: "draft",
  };
  if (typeof values.action === "string" && statusActions[values.action]) {
    const nextStatus = statusActions[values.action];
    const { data: current, error: currentError } = await auth.context.supabase.from("projects").select("id,status").eq("id", id).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (values.action === "unpublish" && current.status !== "published") return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    if (values.action === "restore" && current.status !== "archived") return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    const { error } = await auth.context.supabase.from("projects").update({
      status: nextStatus,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: "status_update_failed" }, { status: 400 });
    await logAdminActivity(auth.context.supabase, auth.context.user.id, `project.${values.action}`, "project", id, { from: current.status, to: nextStatus });
    return NextResponse.json({ saved: true, status: nextStatus }, { headers: { "Cache-Control": "no-store" } });
  }

  const parsed = projectInputSchema.safeParse(values);
  if (!parsed.success) return NextResponse.json({ error: "invalid_project", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc("admin_save_project", { p_payload: parsed.data, p_project_id: id });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "slug_conflict" : "save_failed" }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ id: data, saved: true }, { headers: { "Cache-Control": "no-store" } });
}

async function cleanupIfUnreferenced(
  supabase: NonNullable<Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabase>>>,
  bucket: string,
  path: string,
  adminUserId: string,
) {
  const referenceQueries = await Promise.all([
    bucket === "project-covers" ? supabase.from("projects").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "project-gallery" || bucket === "approved-documents" ? supabase.from("project_media").select("id", { count: "exact", head: true }).eq("bucket_name", bucket).eq("object_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "department-images" ? supabase.from("departments").select("id", { count: "exact", head: true }).eq("cover_image_path", path) : Promise.resolve({ count: 0, error: null }),
    bucket === "team-images" ? supabase.from("teams").select("id", { count: "exact", head: true }).eq("image_path", path) : Promise.resolve({ count: 0, error: null }),
  ]);
  if (referenceQueries.some((result) => result.error)) {
    await supabase.from("media_uploads").update({ claimed_at: null }).eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", adminUserId);
    return false;
  }
  if (referenceQueries.some((result) => Number(result.count ?? 0) > 0)) return true;
  const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
  if (storageError) {
    await supabase.from("media_uploads").update({ claimed_at: null }).eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", adminUserId);
    return false;
  }
  const { error: registryError } = await supabase.from("media_uploads").delete().eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", adminUserId);
  if (registryError) {
    await supabase.from("media_uploads").update({ claimed_at: null }).eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", adminUserId);
    return false;
  }
  return true;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: project, error: readError } = await auth.context.supabase.from("projects").select("id,slug,cover_image_path,project_media(bucket_name,object_path)").eq("id", id).maybeSingle();
  if (readError || !project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const paths = new Set<string>();
  const buckets = new Map<string, string>();
  if (project.cover_image_path) { paths.add(project.cover_image_path); buckets.set(project.cover_image_path, "project-covers"); }
  const media = Array.isArray(project.project_media) ? project.project_media as Array<{ bucket_name: string; object_path: string | null }> : [];
  media.forEach((item) => { if (item.object_path) { paths.add(item.object_path); buckets.set(item.object_path, item.bucket_name); } });
  const { error: deleteError } = await auth.context.supabase.from("projects").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "delete_failed" }, { status: 400 });
  await logAdminActivity(auth.context.supabase, auth.context.user.id, "project.deleted", "project", id, { slug: project.slug });
  const cleanupResults = await Promise.all([...paths].map((path) => cleanupIfUnreferenced(auth.context!.supabase, buckets.get(path)!, path, auth.context!.user.id)));
  const cleanupPending = cleanupResults.some((result) => !result);
  return NextResponse.json({ deleted: true, cleanupPending }, { headers: { "Cache-Control": "no-store" } });
}
