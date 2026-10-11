import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const supabase = createServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
  const { data: media, error } = await supabase.from("project_media").select("id,project_id,bucket_name,object_path,kind,is_public_approved,title_en").eq("id", id).maybeSingle();
  if (error || !media || media.kind !== "document" || media.bucket_name !== "approved-documents" || !media.is_public_approved || !media.object_path) {
    return NextResponse.json({ error: "Document not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { data: project } = await supabase.from("projects").select("id").eq("id", media.project_id).eq("status", "published").maybeSingle();
  if (!project) return NextResponse.json({ error: "Document not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: signed, error: signingError } = await supabase.storage.from("approved-documents").createSignedUrl(media.object_path, 90, { download: true });
  if (signingError || !signed?.signedUrl) return NextResponse.json({ error: "Document is temporarily unavailable." }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
