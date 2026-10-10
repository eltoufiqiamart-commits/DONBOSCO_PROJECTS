import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/locales";

function preferredLocale(request: NextRequest): string {
  const cookie = request.cookies.get("preferred-locale")?.value;
  if (cookie && isLocale(cookie)) return cookie;
  const accepted = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (accepted.includes("ar")) return "ar";
  if (accepted.includes("it")) return "it";
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const locale = isLocale(firstSegment) ? firstSegment : preferredLocale(request);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }
  if (pathname === "/admin") {
    return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", locale);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
