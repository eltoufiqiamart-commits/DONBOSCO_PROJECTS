"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t, type TranslationKey } from "@/i18n/dictionaries";

type ContentKey = "home.hero_title" | "home.hero_description" | "home.industry_title" | "home.industry_description" | "home.final_title" | "home.final_description";
type Copy = { key: ContentKey; en: string; ar: string; it: string };
type Stats = { projects: boolean; departments: boolean; teams: boolean; years: boolean };
const definitions: Array<{ key: ContentKey; title: TranslationKey; multiline: boolean }> = [
  { key: "home.hero_title", title: "admin.homeHeroTitle", multiline: false },
  { key: "home.hero_description", title: "admin.homeHeroDescription", multiline: true },
  { key: "home.industry_title", title: "admin.industrySectionTitle", multiline: false },
  { key: "home.industry_description", title: "admin.industrySectionDescription", multiline: true },
  { key: "home.final_title", title: "admin.finalSectionTitle", multiline: false },
  { key: "home.final_description", title: "admin.finalSectionDescription", multiline: true },
];

export function AdminContentEditor({ locale }: { locale: Locale }) {
  const [content, setContent] = useState<Copy[]>([]);
  const [stats, setStats] = useState<Stats>({ projects: true, departments: true, teams: true, years: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/content", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error("load_failed");
      const existing = new Map<string, Record<string, string>>(data.content.map((row: Record<string, string>) => [row.key, row]));
      setContent(definitions.map(({ key }) => {
        const row = existing.get(key);
        return { key, en: row?.content_en ?? "", ar: row?.content_ar ?? "", it: row?.content_it ?? "" };
      }));
      setStats({ projects: data.statistics?.show_projects !== false, departments: data.statistics?.show_departments !== false, teams: data.statistics?.show_teams !== false, years: data.statistics?.show_years !== false });
    }).catch(() => { if (!controller.signal.aborted) setError(t(locale, "admin.errorLoading")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [locale]);

  function update(key: ContentKey, language: "en" | "ar" | "it", value: string) {
    setContent((current) => current.map((row) => row.key === key ? { ...row, [language]: value } : row));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/content", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content, statistics: stats }) });
      if (!response.ok) throw new Error("save_failed");
      setMessage(t(locale, "admin.contentSaved"));
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setSaving(false); }
  }

  return (
    <form className="admin-content-editor" onSubmit={save}>
      <div className="admin-panel-card admin-copy-panel">
        <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.contentTitle")}</p><h2>{t(locale, "admin.contentIntro")}</h2></div></div>
        {loading ? <div className="admin-loading-state">{t(locale, "common.loading")}</div> : definitions.map(({ key, title, multiline }) => {
          const row = content.find((item) => item.key === key) ?? { key, en: "", ar: "", it: "" };
          return <fieldset className="cms-copy-fieldset" key={key}>
            <legend>{t(locale, title)}</legend>
            <div className="localized-input-grid">
              {(["en", "ar", "it"] as const).map((language) => {
                const name = language === "en" ? t(locale, "admin.englishContent") : language === "ar" ? t(locale, "admin.arabicContent") : t(locale, "admin.italianContent");
                const id = `${key}-${language}`;
                return <label className="localized-input-cell" htmlFor={id} key={language}><span className={`locale-marker locale-marker--${language}`}>{language.toUpperCase()}</span><span className="sr-only">{name}</span>{multiline ? <textarea id={id} rows={3} value={row[language]} onChange={(event) => update(key, language, event.target.value)} required maxLength={2000} /> : <input id={id} value={row[language]} onChange={(event) => update(key, language, event.target.value)} required maxLength={2000} />}</label>;
              })}
            </div>
          </fieldset>;
        })}
      </div>
      <div className="admin-panel-card admin-statistics-config">
        <div className="admin-card-heading"><div><p className="eyebrow">{t(locale, "admin.overview")}</p><h2>{t(locale, "admin.statisticsVisibility")}</h2></div></div>
        {([
          ["projects", "admin.showProjectsStat"], ["departments", "admin.showDepartmentsStat"], ["teams", "admin.showTeamsStat"], ["years", "admin.showYearsStat"],
        ] as Array<[keyof Stats, TranslationKey]>).map(([key, label]) => <label className="check-control" key={key}><input type="checkbox" checked={stats[key]} onChange={(event) => setStats((current) => ({ ...current, [key]: event.target.checked }))} /><span>{t(locale, label)}</span></label>)}
      </div>
      {message && <p className="form-success-text" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-form-actions"><button type="submit" className="button button-red" disabled={saving || loading}><Save size={16} />{saving ? t(locale, "common.saving") : t(locale, "common.save")}</button></div>
    </form>
  );
}
