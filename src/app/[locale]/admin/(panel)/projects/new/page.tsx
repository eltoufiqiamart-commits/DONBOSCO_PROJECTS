import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { createServerSupabase } from "@/lib/supabase/server";
import { projectDemoColumnsSupported } from "@/lib/schema-capabilities";
import { AdminProjectForm } from "@/features/admin/admin-project-form";

export default async function NewAdminProjectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const supabase = await createServerSupabase();
  const [departmentResult, teamResult] = supabase ? await Promise.all([
    supabase.from("departments").select("id,slug,name_en,name_ar,name_it").order("display_order"),
    supabase.from("teams").select("id,name_en,name_ar,name_it,status").order("name_en"),
  ]) : [{ data: [] }, { data: [] }];
  const demoSupported = await projectDemoColumnsSupported(supabase);
  return (
    <div className="admin-page admin-edit-page">
      <div className="admin-page-heading"><div><Link className="back-link" href={`/${raw}/admin/projects`}><ArrowLeft size={16} />{t(raw, "admin.projects")}</Link><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.newProject")}</h1></div></div>
      <AdminProjectForm locale={raw} departments={(departmentResult.data ?? []) as never[]} teams={(teamResult.data ?? []) as never[]} demoSupported={demoSupported} />
    </div>
  );
}
