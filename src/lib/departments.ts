import type { Department } from "@/types/domain";
import type { Locale } from "@/i18n/locales";

// These programme titles are drawn from the institute's published programme page.
export const PRIMARY_DEPARTMENTS = [
  {
    slug: "mechanical-technician",
    order: 1,
    name: { en: "Mechanical Technician", ar: "فني ميكانيكي", it: "Tecnico meccanico" },
  },
  {
    slug: "electrical-technician",
    order: 2,
    name: { en: "Electrical Technician", ar: "فني كهربائي", it: "Tecnico elettrico" },
  },
  {
    slug: "information-technology-technician",
    order: 3,
    name: { en: "Information Technology Technician", ar: "فني تكنولوجيا المعلومات", it: "Tecnico informatico" },
  },
] as const;

export function defaultDepartments(): Department[] {
  return PRIMARY_DEPARTMENTS.map((item) => ({
    id: item.slug,
    slug: item.slug,
    name_en: item.name.en,
    name_ar: item.name.ar,
    name_it: item.name.it,
    description_en: "",
    description_ar: "",
    description_it: "",
    cover_image_path: null,
    display_order: item.order,
    is_active: true,
  }));
}

export function localizedDepartmentName(department: Department, locale: Locale): string {
  const value = locale === "ar" ? department.name_ar : locale === "it" ? department.name_it : department.name_en;
  return value?.trim() || department.name_en;
}

export function localizedDepartmentDescription(department: Department, locale: Locale): string {
  const value = locale === "ar" ? department.description_ar : locale === "it" ? department.description_it : department.description_en;
  return value?.trim() || department.description_en || "";
}
