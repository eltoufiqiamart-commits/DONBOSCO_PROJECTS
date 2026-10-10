import type { Locale } from "@/i18n/locales";

export type ProjectStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type IndustryStatus = "none" | "suitable" | "seeking_partner" | "in_development";
export type MediaKind = "image" | "video" | "document";

export interface LocalizedText {
  en?: string | null;
  ar?: string | null;
  it?: string | null;
}

export interface Department {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  name_it: string;
  description_en: string | null;
  description_ar: string | null;
  description_it: string | null;
  cover_image_path: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface Tag {
  id?: string;
  slug: string;
  label_en: string;
  label_ar: string;
  label_it: string;
}

export type Category = Tag;

export interface PublicStudent {
  id: string;
  display_name_en: string;
  display_name_ar: string | null;
  display_name_it: string | null;
  bio_en: string | null;
  bio_ar: string | null;
  bio_it: string | null;
  profile_image_path: string | null;
}

export interface PublicTeam {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  name_it: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  short_description_it: string | null;
  image_path: string | null;
  graduation_year: number | null;
  department?: Department | null;
  members?: PublicStudent[];
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  kind: MediaKind;
  bucket_name: string;
  object_path: string | null;
  video_url: string | null;
  title_en: string | null;
  title_ar: string | null;
  title_it: string | null;
  caption_en: string | null;
  caption_ar: string | null;
  caption_it: string | null;
  alt_en: string | null;
  alt_ar: string | null;
  alt_it: string | null;
  sort_order: number;
  is_public_approved: boolean;
  created_at?: string;
}

export interface ProjectAward {
  id: string;
  title_en: string;
  title_ar: string | null;
  title_it: string | null;
  issuer_en: string | null;
  issuer_ar: string | null;
  issuer_it: string | null;
  award_date: string | null;
  verified: boolean;
}

export interface Project {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  title_it: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  short_description_it: string | null;
  description_en: string | null;
  description_ar: string | null;
  description_it: string | null;
  problem_statement_en: string | null;
  problem_statement_ar: string | null;
  problem_statement_it: string | null;
  objectives_en: string | null;
  objectives_ar: string | null;
  objectives_it: string | null;
  proposed_solution_en: string | null;
  proposed_solution_ar: string | null;
  proposed_solution_it: string | null;
  technical_implementation_en: string | null;
  technical_implementation_ar: string | null;
  technical_implementation_it: string | null;
  technical_specifications: Record<string, unknown> | null;
  academic_program_en: string | null;
  academic_program_ar: string | null;
  academic_program_it: string | null;
  project_duration_en: string | null;
  project_duration_ar: string | null;
  project_duration_it: string | null;
  department_id: string;
  team_id: string | null;
  supervisor_name_en: string | null;
  supervisor_name_ar: string | null;
  supervisor_name_it: string | null;
  graduation_year: number;
  completion_date: string | null;
  status: ProjectStatus;
  featured: boolean;
  award_winning: boolean;
  industry_status: IndustryStatus;
  cover_image_path: string | null;
  cover_alt_en?: string | null;
  cover_alt_ar?: string | null;
  cover_alt_it?: string | null;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  team?: PublicTeam | null;
  tags?: Tag[];
  categories?: Category[];
  media?: ProjectMedia[];
  awards?: ProjectAward[];
}

export interface ProjectListResult {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  configured: boolean;
  error?: boolean;
}

export function localizedField<T extends object>(
  item: T | null | undefined,
  stem: string,
  locale: Locale,
): string {
  if (!item) return "";
  const record = item as unknown as Record<string, unknown>;
  const localeValue = record[`${stem}_${locale}`];
  const englishValue = record[`${stem}_en`];
  const fallback = record[`${stem}_ar`] ?? record[`${stem}_it`];
  const chosen = [localeValue, englishValue, fallback].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return typeof chosen === "string" ? chosen.trim() : "";
}
