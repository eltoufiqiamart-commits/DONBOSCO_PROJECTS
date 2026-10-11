import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { sniffMediaMime } from "@/lib/file-signatures";

const allowedBuckets = new Set(["project-covers", "project-gallery", "department-images", "team-images", "approved-documents"]);

export async function POST(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const values = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const bucket = typeof values.bucket === "string" ? values.bucket : "";
  const path = typeof values.path === "string" ? values.path : "";
  if (!allowedBuckets.has(bucket) || !path.startsWith(`${auth.context.user.id}/`) || path.length > 500 || path.includes("..") || path.includes("\\")) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { data: registered } = await auth.context.supabase.from("media_uploads").select("id").eq("bucket_name", bucket).eq("object_path", path).eq("uploaded_by", auth.context.user.id).maybeSingle();
  if (!registered) return NextResponse.json({ error: "upload_not_registered" }, { status: 403 });
  const { data: file, error } = await auth.context.supabase.storage.from(bucket).download(path);
  if (error || !file) return NextResponse.json({ error: "upload_incomplete" }, { status: 400 });
  const maxBytes = bucket === "approved-documents" ? 12 * 1024 * 1024 : 8 * 1024 * 1024;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMediaMime(bytes);
  const validForBucket = bucket === "approved-documents" ? mime === "application/pdf" : mime?.startsWith("image/");
  const validContentType = !file.type || file.type === mime;
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes || !mime || !validForBucket || !validContentType) {
    await auth.context.supabase.storage.from(bucket).remove([path]);
    await auth.context.supabase.from("media_uploads").delete().eq("id", registered.id);
    return NextResponse.json({ error: "invalid_file_signature" }, { status: 400 });
  }
  return NextResponse.json({ bucket, path, verified: true }, { headers: { "Cache-Control": "no-store" } });
}
