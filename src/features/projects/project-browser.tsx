"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedDepartmentName } from "@/lib/departments";
import type { Department, Project, ProjectListResult } from "@/types/domain";
import type { PublicFacets } from "@/lib/data";
import { ProjectCard } from "@/components/content-cards";
import { EmptyState } from "@/components/content-cards";

type Sort = "newest" | "oldest" | "alphabetical" | "most_viewed";
type State = { query: string; department: string; year: string; category: string; featured: boolean; awarded: boolean; seekingPartner: boolean; sort: Sort; page: number };
type InitialFilters = Omit<Partial<State>, "year"> & { year?: string | number };
type Props = {
  locale: Locale;
  initialResult: ProjectListResult;
  departments: Department[];
  facets: PublicFacets;
  initialFilters?: InitialFilters;
  lockedDepartment?: string;
};

type ApiResult = { items: Project[]; total: number; configured?: boolean; error?: boolean; page: number; pageSize: number };

function buildParams(state: State, lockedDepartment?: string) {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (lockedDepartment || state.department) params.set("department", lockedDepartment || state.department);
  if (state.year) params.set("year", state.year);
  if (state.category) params.set("category", state.category);
  if (state.featured) params.set("featured", "true");
  if (state.awarded) params.set("awarded", "true");
  if (state.seekingPartner) params.set("partner", "true");
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

function SkeletonCard() {
  return <div className="project-skeleton" aria-hidden="true"><div className="skeleton-image" /><div className="skeleton-line skeleton-line--short" /><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>;
}

export function ProjectBrowser({ locale, initialResult, departments, facets, initialFilters = {}, lockedDepartment }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<State>({
    query: initialFilters.query ?? "",
    department: lockedDepartment ?? initialFilters.department ?? "",
    year: initialFilters.year ? String(initialFilters.year) : "",
    category: initialFilters.category ?? "",
    featured: initialFilters.featured ?? false,
    awarded: initialFilters.awarded ?? false,
    seekingPartner: initialFilters.seekingPartner ?? false,
    sort: initialFilters.sort ?? "newest",
    page: initialFilters.page ?? 1,
  });
  const [items, setItems] = useState<Project[]>(initialResult.items);
  const [total, setTotal] = useState(initialResult.total);
  const [configured, setConfigured] = useState(initialResult.configured);
  const [isError, setIsError] = useState(Boolean(initialResult.error));
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const pageSize = initialResult.pageSize || 9;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const query = buildParams(filters, lockedDepartment);
      router.replace(`${pathname}${query.size ? `?${query.toString()}` : ""}`, { scroll: false });
      setLoading(true);
      void (async () => {
        try {
          const response = await fetch(`/api/projects?${query.toString()}&locale=${locale}`, { signal: controller.signal, cache: "no-store" });
          const payload = (await response.json()) as ApiResult;
          if (!response.ok) throw new Error("Project search failed");
          setItems(Array.isArray(payload.items) ? payload.items : []);
          setTotal(Number(payload.total) || 0);
          setConfigured(Boolean(payload.configured));
          setIsError(Boolean(payload.error));
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) setIsError(true);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, filters.query === initialFilters.query ? 80 : 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters, initialFilters.query, locale, pathname, lockedDepartment, router]);

  function update<K extends keyof State>(key: K, value: State[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? (value as number) : 1 }));
  }

  function reset() {
    setFilters({ query: "", department: lockedDepartment ?? "", year: "", category: "", featured: false, awarded: false, seekingPartner: false, sort: "newest", page: 1 });
  }

  const activeCount = Number(Boolean(filters.query.trim())) + Number(Boolean(filters.year)) + Number(Boolean(filters.category)) + Number(filters.featured) + Number(filters.awarded) + Number(filters.seekingPartner) + Number(Boolean(filters.department && !lockedDepartment));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNoActiveCriteria = activeCount === 0;
  const departmentLabel = t(locale, "projects.filterDepartment");
  const previous = locale === "ar" ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />;
  const next = locale === "ar" ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />;

  return (
    <div className="project-browser">
      <div className="browser-toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t(locale, "common.search")}</span>
          <input type="search" value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder={t(locale, "projects.searchPlaceholder")} maxLength={120} />
          {filters.query && <button type="button" className="search-clear" aria-label={t(locale, "common.clearSearch")} onClick={() => update("query", "")}><X size={15} /></button>}
        </label>
        <label className="sort-select">
          <span>{t(locale, "projects.sortLabel")}</span>
          <select value={filters.sort} onChange={(event) => update("sort", event.target.value as Sort)}>
            <option value="newest">{t(locale, "projects.sortNewest")}</option>
            <option value="oldest">{t(locale, "projects.sortOldest")}</option>
            <option value="alphabetical">{t(locale, "projects.sortAlphabetical")}</option>
            <option value="most_viewed">{t(locale, "projects.sortMostViewed")}</option>
          </select><ChevronDown size={15} aria-hidden="true" />
        </label>
        <button type="button" className={`filter-toggle${mobileFiltersOpen ? " is-active" : ""}`} aria-expanded={mobileFiltersOpen} aria-controls="project-filters" onClick={() => setMobileFiltersOpen((value) => !value)}>
          <SlidersHorizontal size={17} aria-hidden="true" />{t(locale, mobileFiltersOpen ? "projects.hideFilters" : "projects.showFilters")}
          {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
      </div>

      <div id="project-filters" className={`project-filter-panel${mobileFiltersOpen ? " is-open" : ""}`}>
        <label className="select-field">
          <span>{t(locale, "common.department")}</span>
          <select value={filters.department} disabled={Boolean(lockedDepartment)} onChange={(event) => update("department", event.target.value)}>
            <option value="">{departmentLabel}</option>
            {departments.map((department) => <option key={department.slug} value={department.slug}>{localizedDepartmentName(department, locale)}</option>)}
          </select>
        </label>
        <label className="select-field">
          <span>{t(locale, "common.year")}</span>
          <select value={filters.year} onChange={(event) => update("year", event.target.value)}>
            <option value="">{t(locale, "projects.filterYear")}</option>
            {facets.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="select-field">
          <span>{t(locale, "projects.tags")}</span>
          <select value={filters.category} onChange={(event) => update("category", event.target.value)}>
            <option value="">{t(locale, "projects.filterCategory")}</option>
            {facets.categories.map((category) => {
              const label = category[`label_${locale}`] || category.label_en;
              return <option key={category.slug} value={category.slug}>{label}</option>;
            })}
          </select>
        </label>
        <div className="filter-checks">
          <label className="check-control"><input type="checkbox" checked={filters.featured} onChange={(event) => update("featured", event.target.checked)} /><span>{t(locale, "projects.filterFeatured")}</span></label>
          <label className="check-control"><input type="checkbox" checked={filters.awarded} onChange={(event) => update("awarded", event.target.checked)} /><span>{t(locale, "projects.filterAwarded")}</span></label>
          <label className="check-control"><input type="checkbox" checked={filters.seekingPartner} onChange={(event) => update("seekingPartner", event.target.checked)} /><span>{t(locale, "projects.filterPartners")}</span></label>
        </div>
        {activeCount > 0 && <button type="button" className="text-link reset-link" onClick={reset}>{t(locale, "common.reset")}</button>}
      </div>

      <div className="browser-results-bar" aria-live="polite" aria-busy={loading}>
        <p>{total.toLocaleString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB")} {total === 1 ? t(locale, "projects.resultOne") : t(locale, "projects.resultMany")}</p>
        {activeCount > 0 && <button type="button" className="reset-inline" onClick={reset}>{t(locale, "common.reset")}</button>}
      </div>

      {isError ? (
        <EmptyState title={t(locale, "error.notAvailable")} description={t(locale, "projects.resultsUnavailable")} />
      ) : loading && items.length === 0 ? (
        <div className="project-grid" aria-label={t(locale, "common.loading")}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : items.length > 0 ? (
        <div className={`project-grid${loading ? " is-loading" : ""}`}>{items.map((project) => <ProjectCard key={project.id} project={project} locale={locale} />)}</div>
      ) : !configured || hasNoActiveCriteria ? (
        <EmptyState title={t(locale, "home.emptyProjectsTitle")} description={t(locale, "home.emptyProjectsDescription")} />
      ) : (
        <EmptyState title={t(locale, "projects.noResultsTitle")} description={t(locale, "projects.noResultsDescription")} />
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label={t(locale, "projects.title")}>
          <button className="pagination-button" type="button" disabled={filters.page <= 1 || loading} onClick={() => update("page", filters.page - 1)}>{previous}<span>{t(locale, "common.previous")}</span></button>
          <span className="pagination-label">{t(locale, "common.page")} <strong>{filters.page}</strong> {t(locale, "common.of")} {totalPages}</span>
          <button className="pagination-button" type="button" disabled={filters.page >= totalPages || loading} onClick={() => update("page", filters.page + 1)}><span>{t(locale, "common.next")}</span>{next}</button>
        </nav>
      )}
    </div>
  );
}
