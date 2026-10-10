import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { AdminDepartmentsEditor } from "@/features/admin/admin-departments-editor";

export default async function AdminDepartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <div className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{t(raw, "admin.dashboard")}</p><h1>{t(raw, "admin.departments")}</h1><p>{t(raw, "admin.departmentsIntro")}</p></div></div><AdminDepartmentsEditor locale={raw} /></div>;
}
