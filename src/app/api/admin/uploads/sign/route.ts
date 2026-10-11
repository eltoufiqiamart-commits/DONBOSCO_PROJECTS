import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { mediaExtension, type AllowedMediaMime } from "@/lib/file-signatures";

const purposes: Record<string, { bucket: string; images: boolean }> = {
  cover: { bucket: "project-covers", images: true },
  gallery: { bucket: "project-gallery", images: true },
  department: { bucket: "department-images", images: true },
  team: { bucket: "team-images", images: true },
  document: { bucket: "approved-documents", images: false },
};
const imageMimeTypes = new Set<AllowedMediaMime>(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const values = body as Record<string, unknown>;
  const purpose = typeof values.purpose === "string" ? purposes[values.purpose] : undefined;
  const mime = typeof values.mime === "string" ? values.mime as AllowedMediaMime : null;
  const size = Number(values.size);
  if (!purpose || !mime || !Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const maxSize = purpose.images ? 8 * 1024 * 1024 : 12 * 1024 * 1024;
  if (size > maxSize || (purpose.images && !imageMimeTypes.has(mime)) || (!purpose.images && mime !== "application/pdf")) {
    return NextResponse.json({ error: "unsupported_file" }, { status: 400 });
  }
  const objectPath = `${auth.context.user.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${mediaExtension(mime)}`;
  const { data, error } = await auth.context.supabase.storage.from(purpose.bucket).createSignedUploadUrl(objectPath, { upsert: false });
  if (error || !data?.token) return NextResponse.json({ error: "upload_unavailable" }, { status: 503 });
  const { error: registryError } = await auth.context.supabase.from("media_uploads").insert({
    bucket_name: purpose.bucket,
    object_path: objectPath,
    uploaded_by: auth.context.user.id,
  });
  if (registryError) {
    await auth.context.supabase.storage.from(purpose.bucket).remove([objectPath]);
    return NextResponse.json({ error: "upload_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ bucket: purpose.bucket, path: objectPath, token: data.token, mime, maxSize }, { headers: { "Cache-Control": "no-store" } });
}
