import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { AdminInquiriesManager } from "@/features/admin/admin-inquiries-manager";

export default async function AdminInquiriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <div className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.inquiries")}</h1><p>{t(raw, "admin.inquiriesIntro")}</p></div></div><AdminInquiriesManager locale={raw} /></div>;
}
