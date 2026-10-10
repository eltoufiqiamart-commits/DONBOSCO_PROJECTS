import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { AdminContentEditor } from "@/features/admin/admin-content-editor";

export default async function AdminContentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <div className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.contentTitle")}</h1><p>{t(raw, "admin.contentIntro")}</p></div></div><AdminContentEditor locale={raw} /></div>;
}
