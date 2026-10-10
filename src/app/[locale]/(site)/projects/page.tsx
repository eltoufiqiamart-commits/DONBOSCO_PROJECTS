import type { Metadata } from "next";
import { t } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/locales";
import { getDepartments, getProjectFacets, searchProjects } from "@/lib/data";
import { ProjectBrowser } from "@/features/projects/project-browser";
import { Eyebrow } from "@/components/content-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "projects.title"), description: t(locale, "projects.description"), robots: { index: true, follow: true } };
}

function parseBoolean(value: string | string[] | undefined) {
  return value === "true" || value === "1";
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) return null;
  const locale: Locale = raw;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const page = Math.max(1, Number(first(query.page)) || 1);
  const year = Number(first(query.year)) || undefined;
  const sortValue = first(query.sort);
  const sort = sortValue === "oldest" || sortValue === "alphabetical" || sortValue === "most_viewed" ? sortValue : "newest";
  const initialFilters = {
    query: first(query.q) || "",
    department: first(query.department) || "",
    year,
    category: first(query.category) || "",
    featured: parseBoolean(query.featured),
    awarded: parseBoolean(query.awarded),
    seekingPartner: parseBoolean(query.partner),
    sort,
    page,
  } as const;
  const [departments, facets, initialResult] = await Promise.all([
    getDepartments(),
    getProjectFacets(),
    searchProjects(locale, initialFilters),
  ]);

  return (
    <div className="page-shell">
      <section className="page-intro page-container">
        <Eyebrow>{t(locale, "projects.kicker")}</Eyebrow>
        <h1>{t(locale, "projects.title")}</h1>
        <p>{t(locale, "projects.description")}</p>
      </section>
      <section className="catalog-section page-container" aria-label={t(locale, "projects.title")}>
        <ProjectBrowser locale={locale} initialResult={initialResult} departments={departments.items} facets={facets} initialFilters={initialFilters} />
      </section>
    </div>
  );
}
