import "server-only";
import { createPublicServerSupabase } from "@/lib/supabase/server";
import { defaultDepartments } from "@/lib/departments";
import type { Department, Project, ProjectListResult, PublicTeam } from "@/types/domain";
import type { Locale } from "@/i18n/locales";

export interface ProjectFilters {
  query?: string;
  department?: string;
  year?: number;
  category?: string;
  featured?: boolean;
  awarded?: boolean;
  seekingPartner?: boolean;
  industryOnly?: boolean;
  sort?: "newest" | "oldest" | "alphabetical" | "most_viewed";
  page?: number;
  pageSize?: number;
}

export interface PublicFacets {
  years: number[];
  categories: Array<{ slug: string; label_en: string; label_ar: string; label_it: string }>;
}

const PROJECT_EMBED = `id,slug,title_en,title_ar,title_it,short_description_en,short_description_ar,short_description_it,description_en,description_ar,description_it,problem_statement_en,problem_statement_ar,problem_statement_it,objectives_en,objectives_ar,objectives_it,proposed_solution_en,proposed_solution_ar,proposed_solution_it,technical_implementation_en,technical_implementation_ar,technical_implementation_it,technical_specifications,academic_program_en,academic_program_ar,academic_program_it,project_duration_en,project_duration_ar,project_duration_it,department_id,team_id,graduation_year,completion_date,status,featured,award_winning,industry_status,cover_image_path,cover_alt_en,cover_alt_ar,cover_alt_it,views_count,published_at,created_at,updated_at,department:departments!projects_department_id_fkey(*),team:teams!projects_team_id_fkey(*,department:departments!teams_department_id_fkey(*),team_members(student:students!team_members_student_id_fkey(id,display_name_en,display_name_ar,display_name_it,bio_en,bio_ar,bio_it,profile_image_path))),project_tags(tags(*)),project_categories(categories(*)),project_media(*)`;

function normalizeProject(input: unknown): Project {
  const row = (input ?? {}) as Record<string, unknown>;
  const tagRows = Array.isArray(row.project_tags) ? row.project_tags : [];
  const categoryRows = Array.isArray(row.project_categories) ? row.project_categories : [];
  const mediaRows = Array.isArray(row.project_media) ? row.project_media : Array.isArray(row.media) ? row.media : [];
  const teamSource = row.team && typeof row.team === "object" ? (row.team as Record<string, unknown>) : null;
  const teamMemberships = Array.isArray(teamSource?.team_members) ? teamSource.team_members : [];
  const team = teamSource
    ? {
        ...teamSource,
        members: teamMemberships.map((entry) => (entry as { student?: unknown }).student).filter(Boolean),
      }
    : null;
  return {
    ...(row as unknown as Project),
    team: team as Project["team"],
    tags: Array.isArray(row.tags)
      ? (row.tags as Project["tags"])
      : tagRows.map((entry) => (entry as { tags?: Project["tags"] extends (infer T)[] | undefined ? T : never }).tags).filter(Boolean) as Project["tags"],
    categories: Array.isArray(row.categories)
      ? (row.categories as Project["categories"])
      : categoryRows.map((entry) => (entry as { categories?: Project["categories"] extends (infer T)[] | undefined ? T : never }).categories).filter(Boolean) as Project["categories"],
    media: mediaRows as Project["media"],
  };
}

export async function getDepartments(): Promise<{ items: Department[]; configured: boolean; error: boolean }> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return { items: defaultDepartments(), configured: false, error: false };
  const { data, error } = await supabase.from("departments").select("*").eq("is_active", true).order("display_order");
  if (error) return { items: defaultDepartments(), configured: true, error: true };
  return { items: (data as Department[]) ?? [], configured: true, error: false };
}

export async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  const departments = await getDepartments();
  return departments.items.find((department) => department.slug === slug) ?? null;
}

export async function searchProjects(locale: Locale, filters: ProjectFilters = {}): Promise<ProjectListResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.max(1, Math.min(24, Math.floor(filters.pageSize ?? 9)));
  const supabase = await createPublicServerSupabase();
  if (!supabase) return { items: [], total: 0, page, pageSize, configured: false };
  const { data, error } = await supabase.rpc("search_published_projects", {
    p_query: filters.query?.trim() || null,
    p_locale: locale,
    p_department_slug: filters.department || null,
    p_graduation_year: filters.year || null,
    p_category_slug: filters.category || null,
    p_featured: filters.featured ? true : null,
    p_awarded: filters.awarded ? true : null,
    p_seeking_partner: filters.seekingPartner ? true : null,
    p_industry_only: filters.industryOnly ? true : false,
    p_sort: filters.sort || "newest",
    p_page: page,
    p_page_size: pageSize,
  });
  if (error || !Array.isArray(data)) return { items: [], total: 0, page, pageSize, configured: true, error: true };
  const rows = data as Array<{ project?: unknown; total_count?: number | string }>;
  return {
    items: rows.map((row) => normalizeProject(row.project)).filter((project) => Boolean(project.id)),
    total: Number(rows[0]?.total_count ?? 0),
    page,
    pageSize,
    configured: true,
  };
}

export async function getFeaturedProjects(limit = 3): Promise<Project[]> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_EMBED)
    .eq("status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return error || !data ? [] : data.map(normalizeProject);
}

export async function getLatestProjects(limit = 3): Promise<Project[]> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_EMBED)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return error || !data ? [] : data.map(normalizeProject);
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROJECT_EMBED}, project_awards(*)`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  const normalized = normalizeProject(data);
  normalized.awards = ((data as Record<string, unknown>).project_awards as Project["awards"])?.filter((award) => award.verified) ?? [];
  return normalized;
}

export async function getPublicTeams(limit = 6): Promise<PublicTeam[]> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("teams")
    .select("*, department:departments!teams_department_id_fkey(*), team_members(student:students!team_members_student_id_fkey(id,display_name_en,display_name_ar,display_name_it,bio_en,bio_ar,bio_it,profile_image_path))")
    .eq("status", "published")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => {
    const source = row as Record<string, unknown>;
    const memberships = Array.isArray(source.team_members) ? source.team_members : [];
    return {
      ...(source as unknown as PublicTeam),
      members: memberships.map((item) => (item as { student?: PublicTeam["members"] extends (infer T)[] | undefined ? T : never }).student).filter(Boolean) as PublicTeam["members"],
    };
  });
}

export async function getPublicStatistics(): Promise<{
  publishedProjects: number;
  departments: number;
  publicTeams: number;
  graduationYears: number;
  visible: { projects: boolean; departments: boolean; teams: boolean; years: boolean };
}> {
  const defaults = {
    publishedProjects: 0,
    departments: 0,
    publicTeams: 0,
    graduationYears: 0,
    visible: { projects: true, departments: true, teams: true, years: true },
  };
  const supabase = await createPublicServerSupabase();
  if (!supabase) return defaults;
  const [projects, departments, teams, years, settings] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.rpc("get_public_department_count"),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_public", true),
    supabase.rpc("get_public_graduation_year_count"),
    supabase.from("statistics_config").select("*").eq("id", true).maybeSingle(),
  ]);
  const config = settings.data as Record<string, unknown> | null;
  return {
    publishedProjects: projects.count ?? 0,
    departments: Number(departments.data ?? 0),
    publicTeams: teams.count ?? 0,
    graduationYears: Number(years.data ?? 0),
    visible: {
      projects: config?.show_projects !== false,
      departments: config?.show_departments !== false,
      teams: config?.show_teams !== false,
      years: config?.show_years !== false,
    },
  };
}

export async function getProjectFacets(): Promise<PublicFacets> {
  const supabase = await createPublicServerSupabase();
  if (!supabase) return { years: [], categories: [] };
  const { data, error } = await supabase.rpc("get_project_facets");
  if (error || !data || typeof data !== "object") return { years: [], categories: [] };
  const result = data as { years?: unknown; categories?: unknown };
  return {
    years: Array.isArray(result.years) ? result.years.map(Number).filter(Number.isFinite) : [],
    categories: Array.isArray(result.categories) ? (result.categories as PublicFacets["categories"]) : [],
  };
}

export async function getSiteContents(keys: string[]): Promise<Record<string, Record<string, string | null>>> {
  const supabase = await createPublicServerSupabase();
  if (!supabase || keys.length === 0) return {};
  const { data, error } = await supabase.from("site_content").select("key,content_en,content_ar,content_it").in("key", keys);
  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row as Record<string, string | null>]));
}

export async function getSiteContent(key: string): Promise<Record<string, string | null> | null> {
  const rows = await getSiteContents([key]);
  return rows[key] ?? null;
}
