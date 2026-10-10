import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

const allowedBuckets = new Set(["project-covers", "project-gallery", "department-images", "team-images", "approved-documents"]);

export async function GET(request: NextRequest) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const bucket = request.nextUrl.searchParams.get("bucket") ?? "";
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!allowedBuckets.has(bucket) || !path.startsWith(`${auth.context.user.id}/`) || path.includes("..") || path.length > 500) {
    return NextResponse.json({ error: "Media not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { data, error } = await auth.context.supabase.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Media not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
