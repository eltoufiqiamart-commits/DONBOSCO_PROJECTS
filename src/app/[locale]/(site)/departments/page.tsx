import type { Metadata } from "next";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { getDepartments } from "@/lib/data";
import { DepartmentCard, EmptyState, Eyebrow } from "@/components/content-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "department.allTitle"), description: t(locale, "department.allDescription") };
}

export default async function DepartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const { items } = await getDepartments();
  return (
    <div className="page-shell">
      <section className="page-intro page-container">
        <Eyebrow>{t(raw, "home.departmentsEyebrow")}</Eyebrow>
        <h1>{t(raw, "department.allTitle")}</h1>
        <p>{t(raw, "department.allDescription")}</p>
      </section>
      <section className="section-block departments-page-grid page-container" aria-label={t(raw, "department.allTitle")}>
        {items.length ? (
          <div className="department-grid">
            {items.map((department, index) => <DepartmentCard key={department.id} department={department} locale={raw} index={index} />)}
          </div>
        ) : (
          <EmptyState title={t(raw, "department.emptyTitle")} description={t(raw, "department.emptyDescription")} />
        )}
      </section>
    </div>
  );
}
