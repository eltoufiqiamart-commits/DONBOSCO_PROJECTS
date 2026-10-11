import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/i18n/locales";
import { searchProjects } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function booleanParam(value: string | null) { return value === "true" || value === "1"; }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawLocale = params.get("locale") ?? "en";
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const rawYear = Number(params.get("year"));
  const rawSort = params.get("sort");
  const sort = rawSort === "oldest" || rawSort === "alphabetical" || rawSort === "most_viewed" ? rawSort : "newest";
  const rawSearch = (params.get("q") ?? "").trim();
  if (rawSearch.length > 120) return NextResponse.json({ error: "Search text is too long." }, { status: 400 });
  const result = await searchProjects(locale, {
    query: rawSearch,
    department: params.get("department")?.slice(0, 100) || undefined,
    year: Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 2200 ? rawYear : undefined,
    category: params.get("category")?.slice(0, 100) || undefined,
    featured: booleanParam(params.get("featured")),
    awarded: booleanParam(params.get("awarded")),
    seekingPartner: booleanParam(params.get("partner")),
    industryOnly: booleanParam(params.get("industry")),
    sort,
    page,
    pageSize: 9,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
