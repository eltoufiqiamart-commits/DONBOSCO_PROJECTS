import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { getDepartmentBySlug, getDepartments, getProjectFacets, searchProjects } from "@/lib/data";
import { localizedDepartmentDescription, localizedDepartmentName } from "@/lib/departments";
import { ProjectBrowser } from "@/features/projects/project-browser";
import { Eyebrow } from "@/components/content-cards";
import { SmartImage } from "@/components/smart-image";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const department = await getDepartmentBySlug(slug);
  const description = department ? localizedDepartmentDescription(department, locale) : "";
  return department ? { title: localizedDepartmentName(department, locale), ...(description ? { description } : {}) } : { title: t(locale, "department.allTitle") };
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: raw, slug }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) notFound();
  const [department, departments, facets] = await Promise.all([getDepartmentBySlug(slug), getDepartments(), getProjectFacets()]);
  if (!department) notFound();
  const page = Math.max(1, Number(first(query.page)) || 1);
  const year = Number(first(query.year)) || undefined;
  const sortValue = first(query.sort);
  const sort = sortValue === "oldest" || sortValue === "alphabetical" || sortValue === "most_viewed" ? sortValue : "newest";
  const initialFilters = {
    query: first(query.q) || "",
    department: slug,
    year,
    category: first(query.category) || "",
    featured: first(query.featured) === "true",
    awarded: first(query.awarded) === "true",
    seekingPartner: first(query.partner) === "true",
    sort,
    page,
  } as const;
  const initialResult = await searchProjects(raw, { ...initialFilters, department: slug });
  const description = localizedDepartmentDescription(department, raw);
  const Arrow = raw === "ar" ? ArrowUpLeft : ArrowUpRight;
  return (
    <div className="page-shell">
      <section className="department-hero page-container">
        <div className="department-hero-copy">
          <Link href={`/${raw}/departments`} className="back-link"><Arrow size={16} aria-hidden="true" />{t(raw, "department.backToAll")}</Link>
          <Eyebrow>{t(raw, "home.departmentsEyebrow")}</Eyebrow>
          <h1>{localizedDepartmentName(department, raw)}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="department-hero-art">
          {department.cover_image_path ? (
            <SmartImage bucket="department-images" path={department.cover_image_path} alt={localizedDepartmentName(department, raw)} entity="department" slug={department.slug} className="department-hero-image" sizes="(max-width: 900px) 100vw, 45vw" />
          ) : (
            <div className="department-hero-monogram" aria-hidden="true"><span>DB</span><i /> <i /> <i /></div>
          )}
        </div>
      </section>
      <section className="catalog-section page-container">
        <div className="catalog-section-heading"><Eyebrow>{t(raw, "projects.kicker")}</Eyebrow><h2>{t(raw, "department.projectHeading")}</h2></div>
        <ProjectBrowser locale={raw} initialResult={initialResult} departments={departments.items} facets={facets} initialFilters={initialFilters} lockedDepartment={slug} />
      </section>
    </div>
  );
}
