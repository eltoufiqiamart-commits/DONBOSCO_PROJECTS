import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { AdminProjectsManager } from "@/features/admin/admin-projects-manager";

export default async function AdminProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.projects")}</h1><p>{t(raw, "admin.manageProjects")}</p></div><Link className="button button-red" href={`/${raw}/admin/projects/new`}>{t(raw, "admin.newProject")} <ArrowUpRight size={16} /></Link></div>
      <AdminProjectsManager locale={raw} />
    </div>
  );
}
