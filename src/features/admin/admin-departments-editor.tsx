"use client";

import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { MediaUploader } from "@/features/admin/media-uploader";

type DepartmentRow = { id: string; slug: string; name_en: string; name_ar: string; name_it: string; description_en: string; description_ar: string; description_it: string; cover_image_path: string | null; display_order: number; is_active: boolean };

export function AdminDepartmentsEditor({ locale }: { locale: Locale }) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/departments", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error("load_failed");
      setDepartments(result.departments ?? []);
    }).catch(() => { if (!controller.signal.aborted) setError(t(locale, "admin.errorLoading")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [locale]);

  function update(id: string, values: Partial<DepartmentRow>) {
    setDepartments((rows) => rows.map((item) => item.id === id ? { ...item, ...values } : item));
  }

  async function saveDepartment(item: DepartmentRow) {
    setSavingId(item.id); setError(""); setSaved("");
    try {
      const response = await fetch(`/api/admin/departments/${item.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: { en: item.name_en, ar: item.name_ar, it: item.name_it }, description: { en: item.description_en, ar: item.description_ar, it: item.description_it }, coverImagePath: item.cover_image_path, isActive: item.is_active, displayOrder: item.display_order }),
      });
      if (!response.ok) throw new Error("save_failed");
      setSaved(item.id);
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setSavingId(""); }
  }

  const languages = [["en", "EN"], ["ar", "AR"], ["it", "IT"]] as const;
  if (loading) return <div className="admin-loading-state">{t(locale, "common.loading")}</div>;
  if (!departments.length) return <div className="admin-empty-card"><Building2 size={22} /><p>{t(locale, "admin.noData")}</p></div>;

  return (
    <div className="admin-departments-grid">
      {departments.map((item) => <article className="admin-department-card" key={item.id}>
        <div className="admin-department-card-head"><span className="admin-department-monogram">DB</span><div><h2>{item[`name_${locale}`] || item.name_en}</h2><span>{item.slug}</span></div><label className="department-active-check"><input type="checkbox" checked={item.is_active} onChange={(event) => update(item.id, { is_active: event.target.checked })} /><span>{t(locale, "admin.departmentActive")}</span></label></div>
        <fieldset className="localized-input-fieldset"><legend>{t(locale, "admin.departmentName")}</legend><div className="localized-input-grid">{languages.map(([language, marker]) => <label className="localized-input-cell" key={language}><span className={`locale-marker locale-marker--${language}`}>{marker}</span><input aria-label={`${t(locale, "admin.departmentName")} ${marker}`} value={item[`name_${language}` as keyof DepartmentRow] as string} maxLength={180} required onChange={(event) => update(item.id, { [`name_${language}`]: event.target.value })} /></label>)}</div></fieldset>
        <fieldset className="localized-input-fieldset"><legend>{t(locale, "admin.departmentDescription")}</legend><div className="localized-input-grid">{languages.map(([language, marker]) => <label className="localized-input-cell" key={language}><span className={`locale-marker locale-marker--${language}`}>{marker}</span><textarea aria-label={`${t(locale, "admin.departmentDescription")} ${marker}`} value={item[`description_${language}` as keyof DepartmentRow] as string} rows={3} maxLength={3000} onChange={(event) => update(item.id, { [`description_${language}`]: event.target.value })} /></label>)}</div></fieldset>
        <MediaUploader locale={locale} purpose="department" label={t(locale, "admin.departmentImage")} hint={t(locale, "admin.mediaHint")} value={item.cover_image_path} onChange={(path) => update(item.id, { cover_image_path: path })} />
        <div className="admin-department-footer"><span>{saved === item.id ? t(locale, "admin.departmentSaved") : ""}</span><button className="button button-red button-small" type="button" disabled={savingId === item.id} onClick={() => void saveDepartment(item)}><Save size={15} />{savingId === item.id ? t(locale, "common.saving") : t(locale, "common.save")}</button></div>
      </article>)}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
