import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { createServerSupabase } from "@/lib/supabase/server";
import { projectDemoColumnsSupported } from "@/lib/schema-capabilities";
import { AdminProjectForm } from "@/features/admin/admin-project-form";
import type { ProjectRecord } from "@/features/admin/admin-project-form";

export default async function EditAdminProjectPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createServerSupabase();
  if (!supabase) notFound();
  const [projectResult, departmentResult, teamResult] = await Promise.all([
    supabase.rpc("admin_get_project", { p_project_id: id }),
    supabase.from("departments").select("id,slug,name_en,name_ar,name_it").order("display_order"),
    supabase.from("teams").select("id,name_en,name_ar,name_it,status").order("name_en"),
  ]);
  if (projectResult.error || !projectResult.data) notFound();
  const row = projectResult.data as unknown as Record<string, unknown>;
  const tags = Array.isArray(row.project_tags) ? row.project_tags.map((item) => (item as { tags?: unknown }).tags).filter(Boolean) : [];
  const categories = Array.isArray(row.project_categories) ? row.project_categories.map((item) => (item as { categories?: unknown }).categories).filter(Boolean) : [];
  const project = { ...row, tags, categories } as ProjectRecord;
  const demoSupported = await projectDemoColumnsSupported(supabase);
  return (
    <div className="admin-page admin-edit-page">
      <div className="admin-page-heading"><div><Link className="back-link" href={`/${raw}/admin/projects`}><ArrowLeft size={16} />{t(raw, "admin.projects")}</Link><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "common.edit")}: {String(row.title_en ?? row.slug)}</h1></div></div>
      <AdminProjectForm locale={raw} departments={(departmentResult.data ?? []) as never[]} teams={(teamResult.data ?? []) as never[]} initialProject={project} demoSupported={demoSupported} />
    </div>
  );
}
