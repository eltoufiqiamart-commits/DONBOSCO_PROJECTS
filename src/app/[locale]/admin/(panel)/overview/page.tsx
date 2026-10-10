import Link from "next/link";
import { ArrowUpRight, Eye, FolderKanban, Layers3, Mail, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { isLocale } from "@/i18n/locales";
import { t, type TranslationKey } from "@/i18n/dictionaries";
import { createServerSupabase } from "@/lib/supabase/server";

const activityKeys: Record<string, TranslationKey> = {
  "project.created": "admin.activityProjectCreated", "project.updated": "admin.activityProjectUpdated", "project.publish": "admin.activityProjectPublished",
  "project.unpublish": "admin.activityProjectUnpublished", "project.approve": "admin.activityProjectApproved", "project.request_revision": "admin.activityProjectRequestRevision",
  "project.reject": "admin.activityProjectRejected", "project.archive": "admin.activityProjectArchived", "project.restore": "admin.activityProjectRestored", "project.deleted": "admin.activityProjectDeleted",
  "team.created": "admin.activityTeamCreated", "team.updated": "admin.activityTeamUpdated", "student.created": "admin.activityStudentCreated", "student.updated": "admin.activityStudentUpdated", "department.updated": "admin.activityDepartmentUpdated",
};

function StatCard({ label, value, icon: Icon, accent = "" }: { label: string; value: number; icon: React.ElementType; accent?: string }) {
  return <article className={`admin-stat-card${accent ? ` ${accent}` : ""}`}><span className="admin-stat-icon"><Icon size={18} aria-hidden="true" /></span><span className="admin-stat-label">{label}</span><strong>{value.toLocaleString()}</strong></article>;
}

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const supabase = await createServerSupabase();
  if (!supabase) return <div className="admin-page"><h1>{t(locale, "admin.overview")}</h1><p>{t(locale, "admin.errorLoading")}</p></div>;
  const { data, error } = await supabase.rpc("admin_get_overview");
  if (error || !data) return <div className="admin-page"><h1>{t(locale, "admin.overview")}</h1><p className="admin-inline-error">{t(locale, "admin.errorLoading")}</p></div>;
  const overview = data as {
    counts: Record<string, number>;
    byDepartment: Array<{ department_id: string; slug: string; name_en: string; name_ar: string; name_it: string; count: number }>;
    byYear: Array<{ year: number; count: number }>;
    recentActivity: Array<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string }>;
  };
  const counts = overview.counts ?? {};
  const countRows = [
    [t(locale, "admin.totalPublished"), Number(counts.published) || 0, FolderKanban, ""],
    [t(locale, "admin.totalDrafts"), Number(counts.draft) || 0, Layers3, ""],
    [t(locale, "admin.totalPending"), Number(counts.pending) || 0, Users, "admin-stat-card--gold"],
    [t(locale, "admin.totalRejected"), Number(counts.rejected) || 0, FolderKanban, ""],
    [t(locale, "admin.totalArchived"), Number(counts.archived) || 0, Layers3, ""],
    [t(locale, "admin.views"), Number(counts.views) || 0, Eye, ""],
    [t(locale, "admin.newInquiries"), Number(counts.inquiries) || 0, Mail, Number(counts.inquiries) > 0 ? "admin-stat-card--red" : ""],
  ] as const;
  const departmentMaximum = Math.max(1, ...overview.byDepartment.map((item) => Number(item.count) || 0));
  const yearMaximum = Math.max(1, ...overview.byYear.map((item) => Number(item.count) || 0));

  return (
    <div className="admin-page">
      <div className="admin-page-heading"><div><p className="eyebrow">{t(locale, "admin.dashboard")}</p><h1>{t(locale, "admin.overview")}</h1><p>{t(locale, "admin.description")}</p></div><Link className="button button-red" href={`/${locale}/admin/projects/new`}>{t(locale, "admin.newProject")} <ArrowUpRight size={16} /></Link></div>
      <section className="admin-stats-grid" aria-label={t(locale, "admin.overview")}>
        {countRows.map(([label, value, icon, accent]) => <StatCard key={label} label={label} value={value} icon={icon} accent={accent} />)}
      </section>
      <div className="admin-overview-grid">
        <section className="admin-panel-card">
          <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.projects")}</p><h2>{t(locale, "admin.byDepartment")}</h2></div><Link href={`/${locale}/admin/projects`} aria-label={t(locale, "admin.manageProjects")}><ArrowUpRight size={18} /></Link></div>
          {overview.byDepartment.length ? <div className="admin-bars-list">{overview.byDepartment.map((item) => <div className="admin-bar-row" key={item.department_id}><div className="admin-bar-label"><span>{item[`name_${locale}`] || item.name_en}</span><strong>{item.count}</strong></div><div className="admin-bar-track"><span style={{ width: `${Math.max(2, (Number(item.count) / departmentMaximum) * 100)}%` }} /></div></div>)}</div> : <p className="admin-empty-text">{t(locale, "admin.noData")}</p>}
        </section>
        <section className="admin-panel-card">
          <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "common.year")}</p><h2>{t(locale, "admin.byYear")}</h2></div></div>
          {overview.byYear.length ? <div className="admin-bars-list">{overview.byYear.map((item) => <div className="admin-bar-row" key={item.year}><div className="admin-bar-label"><span>{item.year}</span><strong>{item.count}</strong></div><div className="admin-bar-track admin-bar-track--gold"><span style={{ width: `${Math.max(2, (Number(item.count) / yearMaximum) * 100)}%` }} /></div></div>)}</div> : <p className="admin-empty-text">{t(locale, "admin.noData")}</p>}
        </section>
      </div>
      <section className="admin-panel-card admin-activity-card">
        <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.dashboard")}</p><h2>{t(locale, "admin.recentActivity")}</h2></div></div>
        {overview.recentActivity.length ? <ol className="admin-activity-list">{overview.recentActivity.map((activity) => {
          const key = activityKeys[activity.action];
          const date = new Date(activity.created_at).toLocaleString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
          return <li key={activity.id}><span className="activity-led" aria-hidden="true" /><div><strong>{key ? t(locale, key) : t(locale, "admin.recentActivity")}</strong><span>{activity.entity_type}</span></div><time dateTime={activity.created_at}>{date}</time></li>;
        })}</ol> : <p className="admin-empty-text">{t(locale, "admin.noActivity")}</p>}
      </section>
    </div>
  );
}
