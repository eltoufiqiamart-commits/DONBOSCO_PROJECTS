import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { AdminTeamsManager } from "@/features/admin/admin-teams-manager";

export default async function AdminTeamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <div className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.teamsTitle")}</h1><p>{t(raw, "admin.teamsIntro")}</p></div></div><AdminTeamsManager locale={raw} /></div>;
}
