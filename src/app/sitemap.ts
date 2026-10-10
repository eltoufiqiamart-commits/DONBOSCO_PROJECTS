import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { getDepartments } from "@/lib/data";
import { createPublicServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) return [];
  let base: URL;
  try { base = new URL(configuredUrl); } catch { return []; }
  const lastModified = new Date();
  const fixedPaths = ["", "/projects", "/departments", "/teams", "/industry", "/about", "/privacy"];
  const urls: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    fixedPaths.forEach((path) => urls.push({ url: new URL(`/${locale}${path}`, base).toString(), lastModified, changeFrequency: path === "" ? "weekly" : "monthly" }));
  }
  const { items: departments } = await getDepartments();
  for (const locale of locales) {
    for (const department of departments) urls.push({ url: new URL(`/${locale}/departments/${department.slug}`, base).toString(), lastModified, changeFrequency: "monthly" });
  }
  const supabase = await createPublicServerSupabase();
  if (supabase) {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from("projects").select("slug,updated_at").eq("status", "published").order("id").range(from, from + pageSize - 1);
      if (error || !data?.length) break;
      for (const project of data) {
        for (const locale of locales) urls.push({ url: new URL(`/${locale}/projects/${project.slug}`, base).toString(), lastModified: project.updated_at ? new Date(project.updated_at) : lastModified, changeFrequency: "monthly" });
      }
      if (data.length < pageSize) break;
    }
  }
  return urls;
}
