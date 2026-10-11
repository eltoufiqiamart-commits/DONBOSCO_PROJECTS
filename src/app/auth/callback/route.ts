import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const candidate = params.get("next") ?? "/en/admin/settings";
  const destination = /^\/(en|ar|it)\/admin\/settings$/.test(candidate) ? candidate : "/en/admin";
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/en/admin", request.url));

  let verified = false;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    verified = !error;
  }
  if (!verified) return NextResponse.redirect(new URL("/en/admin", request.url));
  return NextResponse.redirect(new URL(destination, request.url), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
