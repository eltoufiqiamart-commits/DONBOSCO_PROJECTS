"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, Plus, Trash2, X } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedField } from "@/types/domain";
import { MediaUploader } from "@/features/admin/media-uploader";

type Localized = { en: string; ar: string; it: string };
type MediaDraft = {
  kind: "image" | "document" | "video";
  bucket_name: "project-gallery" | "approved-documents";
  object_path: string | null;
  video_url: string | null;
  title_en: string | null; title_ar: string | null; title_it: string | null;
  caption_en: string | null; caption_ar: string | null; caption_it: string | null;
  alt_en: string | null; alt_ar: string | null; alt_it: string | null;
  sort_order: number;
  is_public_approved: boolean;
};
type AwardDraft = { title_en: string; title_ar: string; title_it: string; issuer_en: string; issuer_ar: string; issuer_it: string; award_date: string; verified: boolean };
export type ProjectRecord = Record<string, unknown> & { id?: string; project_media?: MediaDraft[]; project_awards?: AwardDraft[]; tags?: Array<Record<string, string>>; categories?: Array<Record<string, string>> };
type DepartmentOption = { id: string; slug: string; name_en: string; name_ar: string; name_it: string };
type TeamOption = { id: string; name_en: string; name_ar?: string | null; name_it?: string | null; status?: string };

type ProjectFormState = {
  slug: string;
  title: Localized;
  shortDescription: Localized;
  description: Localized;
  problemStatement: Localized;
  objectives: Localized;
  proposedSolution: Localized;
  technicalImplementation: Localized;
  academicProgram: Localized;
  projectDuration: Localized;
  supervisorName: Localized;
  coverAlt: Localized;
  departmentId: string;
  teamId: string;
  graduationYear: string;
  completionDate: string;
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  featured: boolean;
  awardWinning: boolean;
  industryStatus: "none" | "suitable" | "seeking_partner" | "in_development";
  coverImagePath: string;
  demoUrl: string;
  demoVisible: boolean;
  tagEn: string;
  tagAr: string;
  tagIt: string;
  categoryEn: string;
  categoryAr: string;
  categoryIt: string;
  specifications: Array<{ id: string; label: Localized; value: Localized }>;
  media: MediaDraft[];
  awards: AwardDraft[];
};

const emptyLocalized = (): Localized => ({ en: "", ar: "", it: "" });
const optionalText = (value: unknown) => typeof value === "string" ? value : "";
function localizedFromUnknown(value: unknown): Localized {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { en: optionalText(row.en), ar: optionalText(row.ar), it: optionalText(row.it) };
}
function formFromRecord(record?: ProjectRecord): ProjectFormState {
  if (!record) return {
    slug: "", title: emptyLocalized(), shortDescription: emptyLocalized(), description: emptyLocalized(), problemStatement: emptyLocalized(), objectives: emptyLocalized(), proposedSolution: emptyLocalized(), technicalImplementation: emptyLocalized(), academicProgram: emptyLocalized(), projectDuration: emptyLocalized(), supervisorName: emptyLocalized(), coverAlt: emptyLocalized(), departmentId: "", teamId: "", graduationYear: String(new Date().getFullYear()), completionDate: "", status: "draft", featured: false, awardWinning: false, industryStatus: "none", coverImagePath: "", demoUrl: "", demoVisible: true, tagEn: "", tagAr: "", tagIt: "", categoryEn: "", categoryAr: "", categoryIt: "", specifications: [], media: [], awards: [],
  };
  const localized = (stem: string): Localized => ({ en: optionalText(record[`${stem}_en`]), ar: optionalText(record[`${stem}_ar`]), it: optionalText(record[`${stem}_it`]) });
  const tags = (record.tags ?? []) as Array<Record<string, string>>;
  const categories = (record.categories ?? []) as Array<Record<string, string>>;
  const specifications = record.technical_specifications && typeof record.technical_specifications === "object" && !Array.isArray(record.technical_specifications) ? record.technical_specifications as Record<string, unknown> : {};
  const specificationRows = Object.entries(specifications).map(([key, value], index) => {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
    if (row && row.label && row.value) return { id: key || `spec-${index}`, label: localizedFromUnknown(row.label), value: localizedFromUnknown(row.value) };
    return { id: key || `spec-${index}`, label: { en: key, ar: "", it: "" }, value: { en: typeof value === "string" ? value : String(value ?? ""), ar: "", it: "" } };
  });
  return {
    slug: optionalText(record.slug),
    title: localized("title"), shortDescription: localized("short_description"), description: localized("description"), problemStatement: localized("problem_statement"), objectives: localized("objectives"), proposedSolution: localized("proposed_solution"), technicalImplementation: localized("technical_implementation"), academicProgram: localized("academic_program"), projectDuration: localized("project_duration"), supervisorName: localized("supervisor_name"), coverAlt: localized("cover_alt"),
    departmentId: optionalText(record.department_id), teamId: optionalText(record.team_id), graduationYear: optionalText(record.graduation_year) || String(new Date().getFullYear()), completionDate: optionalText(record.completion_date).slice(0, 10),
    status: (record.status as ProjectFormState["status"]) || "draft", featured: Boolean(record.featured), awardWinning: Boolean(record.award_winning), industryStatus: (record.industry_status as ProjectFormState["industryStatus"]) || "none", coverImagePath: optionalText(record.cover_image_path),
    demoUrl: optionalText(record.demo_url), demoVisible: record.demo_visible !== false,
    tagEn: tags.map((item) => item.label_en).filter(Boolean).join(", "), tagAr: tags.map((item) => item.label_ar).filter(Boolean).join(", "), tagIt: tags.map((item) => item.label_it).filter(Boolean).join(", "),
    categoryEn: categories.map((item) => item.label_en).filter(Boolean).join(", "), categoryAr: categories.map((item) => item.label_ar).filter(Boolean).join(", "), categoryIt: categories.map((item) => item.label_it).filter(Boolean).join(", "),
    specifications: specificationRows,
    media: (record.project_media ?? []).map((item) => ({ ...item, sort_order: Number(item.sort_order) || 0 })),
    awards: (record.project_awards ?? []).map((item) => ({ ...item, title_en: item.title_en || "", title_ar: item.title_ar || "", title_it: item.title_it || "", issuer_en: item.issuer_en || "", issuer_ar: item.issuer_ar || "", issuer_it: item.issuer_it || "", award_date: item.award_date || "", verified: Boolean(item.verified) })),
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}
function localizedList(en: string, ar: string, it: string) {
  const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  const english = split(en);
  const arabic = split(ar);
  const italian = split(it);
  return english.map((label_en, index) => ({
    slug: slugify(label_en), label_en,
    label_ar: arabic[index] || null,
    label_it: italian[index] || null,
  })).filter((item) => item.slug);
}
function localizedRecordField(record: Record<string, unknown>, stem: string, locale: Locale) {
  const value = localizedField(record, stem, locale);
  return value || "";
}

export function LocalizedInput({ label, value, onChange, multiline = false, required = false, maxLength = 12000 }: { label: string; value: Localized; onChange: (next: Localized) => void; multiline?: boolean; required?: boolean | "all"; maxLength?: number }) {
  const inputId = useId();
  const languages: Array<{ code: keyof Localized; label: string }> = [{ code: "en", label: "EN" }, { code: "ar", label: "AR" }, { code: "it", label: "IT" }];
  return (
    <fieldset className="localized-input-fieldset">
      <legend>{label}{required && <span className="required-mark"> *</span>}</legend>
      <div className="localized-input-grid">
        {languages.map(({ code, label: langLabel }) => {
          const id = `${inputId}-${code}`;
          const control = multiline ? <textarea id={id} value={value[code]} onChange={(event) => onChange({ ...value, [code]: event.target.value })} rows={code === "en" ? 4 : 3} maxLength={maxLength} required={required === "all" || (required === true && code === "en")} /> : <input id={id} value={value[code]} onChange={(event) => onChange({ ...value, [code]: event.target.value })} maxLength={maxLength} required={required === "all" || (required === true && code === "en")} />;
          return <label className="localized-input-cell" htmlFor={id} key={code}><span className={`locale-marker locale-marker--${code}`}>{langLabel}</span>{control}</label>;
        })}
      </div>
    </fieldset>
  );
}

function localizedFrom(media: MediaDraft, stem: "title" | "caption" | "alt"): Localized {
  return { en: optionalText(media[`${stem}_en` as keyof MediaDraft]), ar: optionalText(media[`${stem}_ar` as keyof MediaDraft]), it: optionalText(media[`${stem}_it` as keyof MediaDraft]) };
}
function mergeLocalized(media: MediaDraft, stem: "title" | "caption" | "alt", value: Localized) {
  return { ...media, [`${stem}_en`]: value.en || null, [`${stem}_ar`]: value.ar || null, [`${stem}_it`]: value.it || null } as MediaDraft;
}

export function AdminProjectForm({ locale, departments, teams, initialProject, demoSupported = false }: { locale: Locale; departments: DepartmentOption[]; teams: TeamOption[]; initialProject?: ProjectRecord | null; demoSupported?: boolean }) {
  const router = useRouter();
  const initialState = formFromRecord(initialProject ?? undefined);
  const [form, setForm] = useState<ProjectFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slugEdited, setSlugEdited] = useState(Boolean(initialProject?.slug));
  const projectId = initialProject?.id ? String(initialProject.id) : "";
  const mediaHint = t(locale, "admin.mediaHint");

  function setField<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function setLocalized<K extends "title" | "shortDescription" | "description" | "problemStatement" | "objectives" | "proposedSolution" | "technicalImplementation" | "academicProgram" | "projectDuration" | "supervisorName" | "coverAlt">(key: K, value: Localized) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function newMedia(kind: "image" | "document" | "video"): MediaDraft {
    return { kind, bucket_name: kind === "document" ? "approved-documents" : "project-gallery", object_path: null, video_url: null, title_en: null, title_ar: null, title_it: null, caption_en: null, caption_ar: null, caption_it: null, alt_en: null, alt_ar: null, alt_it: null, sort_order: form.media.length, is_public_approved: false };
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.title.en.trim()) { setError(t(locale, "admin.requiredEnglish")); return; }
    if (!form.departmentId) { setError(t(locale, "industry.requiredField")); return; }
    const specifications: Record<string, { label: Localized; value: Localized }> = {};
    form.specifications.filter((item) => item.label.en.trim() && item.value.en.trim()).forEach((item, index) => {
      const base = slugify(item.label.en) || `spec-${index + 1}`;
      let key = base;
      let suffix = 2;
      while (Object.prototype.hasOwnProperty.call(specifications, key)) key = `${base}-${suffix++}`;
      specifications[key] = { label: item.label, value: item.value };
    });
    const payload = {
      slug: form.slug,
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      problemStatement: form.problemStatement,
      objectives: form.objectives,
      proposedSolution: form.proposedSolution,
      technicalImplementation: form.technicalImplementation,
      academicProgram: form.academicProgram,
      projectDuration: form.projectDuration,
      supervisorName: form.supervisorName,
      coverAlt: form.coverAlt,
      departmentId: form.departmentId,
      teamId: form.teamId || null,
      graduationYear: Number(form.graduationYear),
      completionDate: form.completionDate || null,
      status: form.status,
      featured: form.featured,
      awardWinning: form.awardWinning,
      industryStatus: form.industryStatus,
      coverImagePath: form.coverImagePath || null,
      ...(demoSupported ? { demoUrl: form.demoUrl.trim() || null, demoVisible: form.demoVisible } : {}),
      technicalSpecifications: specifications,
      tags: localizedList(form.tagEn, form.tagAr, form.tagIt),
      categories: localizedList(form.categoryEn, form.categoryAr, form.categoryIt),
      media: form.media.filter((item) => item.kind === "video" ? Boolean(item.video_url) : Boolean(item.object_path)),
      awards: form.awards.filter((award) => award.title_en.trim()).map((award) => ({ ...award, award_date: award.award_date || null })),
    };
    const oldFiles: Array<{ bucket: string; path: string }> = [];
    if (initialProject?.cover_image_path && initialProject.cover_image_path !== form.coverImagePath) oldFiles.push({ bucket: "project-covers", path: String(initialProject.cover_image_path) });
    const previousMedia = (initialProject?.project_media ?? []) as MediaDraft[];
    const nextPaths = new Set(form.media.filter((item) => item.object_path).map((item) => `${item.bucket_name}:${item.object_path}`));
    previousMedia.forEach((item) => { if (item.object_path && !nextPaths.has(`${item.bucket_name}:${item.object_path}`)) oldFiles.push({ bucket: item.bucket_name, path: item.object_path }); });

    setLoading(true);
    try {
      const response = await fetch(projectId ? `/api/admin/projects/${projectId}` : "/api/admin/projects", {
        method: projectId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error === "slug_conflict" ? t(locale, "admin.projectSaveError") : t(locale, "admin.projectSaveError"));
        return;
      }
      await Promise.all(oldFiles.map(({ bucket, path }) => fetch("/api/admin/media/cleanup-one", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bucket, path }) })));
      router.replace(`/${locale}/admin/projects/${result.id ?? projectId}`);
      router.refresh();
    } catch {
      setError(t(locale, "admin.projectSaveError"));
    } finally { setLoading(false); }
  }

  const previewTitle = localizedRecordField({ title_en: form.title.en, title_ar: form.title.ar, title_it: form.title.it }, "title", locale) || t(locale, "admin.projectTitle");
  const previewDescription = localizedRecordField({ short_description_en: form.shortDescription.en, short_description_ar: form.shortDescription.ar, short_description_it: form.shortDescription.it }, "short_description", locale);

  return (
    <>
      <form className="admin-project-form" onSubmit={save}>
        <section className="admin-form-section">
          <div className="admin-form-section-heading"><span className="form-section-number">01</span><div><h2>{t(locale, "admin.translations")}</h2><p>{t(locale, "admin.requiredEnglish")}</p></div></div>
          <LocalizedInput label={t(locale, "admin.projectTitle")} value={form.title} onChange={(value) => { setLocalized("title", value); if (!slugEdited && value.en) setField("slug", slugify(value.en)); }} required="all" maxLength={240} />
          <div className="form-grid-two">
            <label className="form-field"><span>{t(locale, "admin.projectSlug")}</span><input value={form.slug} onChange={(event) => { setSlugEdited(true); setField("slug", slugify(event.target.value)); }} required minLength={2} maxLength={160} /></label>
            <label className="form-field"><span>{t(locale, "admin.departmentId")}</span><select value={form.departmentId} onChange={(event) => setField("departmentId", event.target.value)} required><option value="">—</option>{departments.map((item) => <option key={item.id} value={item.id}>{item[`name_${locale}`] || item.name_en}</option>)}</select></label>
          </div>
          <LocalizedInput label={t(locale, "admin.shortDescription")} value={form.shortDescription} onChange={(value) => setLocalized("shortDescription", value)} multiline maxLength={900} />
          <LocalizedInput label={t(locale, "admin.fullDescription")} value={form.description} onChange={(value) => setLocalized("description", value)} multiline maxLength={18000} />
          <LocalizedInput label={t(locale, "admin.problemStatement")} value={form.problemStatement} onChange={(value) => setLocalized("problemStatement", value)} multiline maxLength={10000} />
          <LocalizedInput label={t(locale, "admin.objectives")} value={form.objectives} onChange={(value) => setLocalized("objectives", value)} multiline maxLength={10000} />
          <LocalizedInput label={t(locale, "admin.solution")} value={form.proposedSolution} onChange={(value) => setLocalized("proposedSolution", value)} multiline maxLength={12000} />
          <LocalizedInput label={t(locale, "admin.implementation")} value={form.technicalImplementation} onChange={(value) => setLocalized("technicalImplementation", value)} multiline maxLength={18000} />
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading"><span className="form-section-number">02</span><div><h2>{t(locale, "admin.departmentId")}</h2><p>{t(locale, "admin.status")}</p></div></div>
          <div className="form-grid-three">
            <label className="form-field"><span>{t(locale, "admin.graduationYear")}</span><input type="number" min="1900" max="2200" value={form.graduationYear} onChange={(event) => setField("graduationYear", event.target.value)} required /></label>
            <label className="form-field"><span>{t(locale, "admin.teamId")}</span><select value={form.teamId} onChange={(event) => setField("teamId", event.target.value)}><option value="">{t(locale, "admin.statusNone")}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team[`name_${locale}` as keyof TeamOption] as string || team.name_en}</option>)}</select></label>
            <label className="form-field"><span>{t(locale, "admin.status")}</span><select value={form.status} onChange={(event) => setField("status", event.target.value as ProjectFormState["status"])}><option value="draft">{t(locale, "admin.statusDraft")}</option><option value="pending">{t(locale, "admin.statusPending")}</option><option value="published">{t(locale, "admin.statusPublished")}</option><option value="rejected">{t(locale, "admin.statusRejected")}</option><option value="archived">{t(locale, "admin.statusArchived")}</option></select></label>
          </div>
          <div className="form-grid-three">
            <LocalizedInput label={t(locale, "admin.supervisor")} value={form.supervisorName} onChange={(value) => setLocalized("supervisorName", value)} maxLength={160} />
            <LocalizedInput label={t(locale, "detail.program")} value={form.academicProgram} onChange={(value) => setLocalized("academicProgram", value)} maxLength={300} />
            <LocalizedInput label={t(locale, "admin.duration")} value={form.projectDuration} onChange={(value) => setLocalized("projectDuration", value)} maxLength={200} />
          </div>
          <label className="form-field form-field--date"><span>{t(locale, "admin.completionDate")}</span><input type="date" value={form.completionDate} onChange={(event) => setField("completionDate", event.target.value)} /></label>
          <div className="form-options">
            <label className="check-control"><input type="checkbox" checked={form.featured} onChange={(event) => setField("featured", event.target.checked)} /><span>{t(locale, "admin.featured")}</span></label>
            <label className="check-control"><input type="checkbox" checked={form.awardWinning} onChange={(event) => setField("awardWinning", event.target.checked)} /><span>{t(locale, "admin.awardWinning")}</span></label>
          </div>
          <label className="form-field"><span>{t(locale, "admin.industryStatusLabel")}</span><select value={form.industryStatus} onChange={(event) => setField("industryStatus", event.target.value as ProjectFormState["industryStatus"])}><option value="none">{t(locale, "admin.statusNone")}</option><option value="suitable">{t(locale, "admin.statusSuitable")}</option><option value="seeking_partner">{t(locale, "admin.statusSeeking")}</option><option value="in_development">{t(locale, "admin.statusDeveloping")}</option></select></label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading"><span className="form-section-number">02b</span><div><h2>{t(locale, "admin.demoSection")}</h2><p>{t(locale, "admin.demoUrlHint")}</p></div></div>
          {!demoSupported && <p className="form-warning" role="status">{t(locale, "admin.demoUnavailable")}</p>}
          <label className="form-field">
            <span>{t(locale, "admin.demoUrl")}</span>
            <input
              type="url"
              inputMode="url"
              dir="ltr"
              placeholder="https://"
              pattern="https://.*"
              title={t(locale, "admin.demoUrlHint")}
              value={form.demoUrl}
              disabled={!demoSupported}
              onChange={(event) => setField("demoUrl", event.target.value)}
              maxLength={1200}
            />
          </label>
          <label className="check-control">
            <input type="checkbox" checked={form.demoVisible} disabled={!demoSupported} onChange={(event) => setField("demoVisible", event.target.checked)} />
            <span>{t(locale, "admin.demoVisible")}</span>
          </label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading"><span className="form-section-number">03</span><div><h2>{t(locale, "admin.coverImage")}</h2><p>{mediaHint}</p></div></div>
          <MediaUploader locale={locale} purpose="cover" label={t(locale, "admin.coverImage")} hint={mediaHint} value={form.coverImagePath || null} onChange={(path) => setField("coverImagePath", path ?? "")} />
          <LocalizedInput label={t(locale, "admin.coverImageAlt")} value={form.coverAlt} onChange={(value) => setLocalized("coverAlt", value)} maxLength={300} />
          <div className="media-list-heading"><h3>{t(locale, "admin.galleryImages")}</h3><button className="button button-outline-dark button-small" type="button" onClick={() => setField("media", [...form.media, newMedia("image")])}><Plus size={15} />{t(locale, "admin.addGalleryImage")}</button></div>
          {form.media.filter((item) => item.kind === "image").map((item) => {
            const index = form.media.indexOf(item);
            return <div className="media-editor-card" key={`gallery-${index}`}>
              <div className="media-editor-toolbar"><span>{t(locale, "admin.galleryImages")}</span><button type="button" className="icon-button danger-icon" aria-label={t(locale, "admin.removeMedia")} onClick={() => setField("media", form.media.filter((_, current) => current !== index))}><Trash2 size={16} /></button></div>
              <MediaUploader locale={locale} purpose="gallery" label={t(locale, "admin.galleryImages")} hint={mediaHint} value={item.object_path} onChange={(path) => setField("media", form.media.map((current, i) => i === index ? { ...current, object_path: path } : current))} />
              <LocalizedInput label={t(locale, "admin.projectTitle")} value={localizedFrom(item, "alt")} onChange={(value) => setField("media", form.media.map((current, i) => i === index ? mergeLocalized(current, "alt", value) : current))} maxLength={300} />
              <LocalizedInput label={t(locale, "admin.shortDescription")} value={localizedFrom(item, "caption")} onChange={(value) => setField("media", form.media.map((current, i) => i === index ? mergeLocalized(current, "caption", value) : current))} maxLength={1200} />
              <label className="check-control"><input type="checkbox" checked={item.is_public_approved} onChange={(event) => setField("media", form.media.map((current, i) => i === index ? { ...current, is_public_approved: event.target.checked } : current))} /><span>{t(locale, "admin.approveMedia")}</span></label>
            </div>;
          })}
          <div className="media-list-heading"><h3>{t(locale, "admin.approvedDocuments")}</h3><button className="button button-outline-dark button-small" type="button" onClick={() => setField("media", [...form.media, newMedia("document")])}><Plus size={15} />{t(locale, "admin.addDocument")}</button></div>
          {form.media.filter((item) => item.kind === "document").map((item) => {
            const index = form.media.indexOf(item);
            return <div className="media-editor-card" key={`document-${index}`}>
              <div className="media-editor-toolbar"><span>{t(locale, "admin.approvedDocuments")}</span><button type="button" className="icon-button danger-icon" aria-label={t(locale, "admin.removeMedia")} onClick={() => setField("media", form.media.filter((_, current) => current !== index))}><Trash2 size={16} /></button></div>
              <MediaUploader locale={locale} purpose="document" label={t(locale, "admin.addDocument")} hint={t(locale, "admin.documentHint")} value={item.object_path} onChange={(path) => setField("media", form.media.map((current, i) => i === index ? { ...current, object_path: path } : current))} image={false} />
              <LocalizedInput label={t(locale, "admin.projectTitle")} value={localizedFrom(item, "title")} onChange={(value) => setField("media", form.media.map((current, i) => i === index ? mergeLocalized(current, "title", value) : current))} maxLength={240} />
              <label className="check-control"><input type="checkbox" checked={item.is_public_approved} onChange={(event) => setField("media", form.media.map((current, i) => i === index ? { ...current, is_public_approved: event.target.checked } : current))} /><span>{t(locale, "admin.approveMedia")}</span></label>
            </div>;
          })}
          <div className="media-list-heading"><h3>{t(locale, "detail.video")}</h3><button className="button button-outline-dark button-small" type="button" onClick={() => setField("media", [...form.media, newMedia("video")])}><Plus size={15} />{t(locale, "admin.addVideo")}</button></div>
          {form.media.filter((item) => item.kind === "video").map((item) => {
            const index = form.media.indexOf(item);
            return <div className="media-editor-card" key={`video-${index}`}>
              <div className="media-editor-toolbar"><span>{t(locale, "detail.video")}</span><button type="button" className="icon-button danger-icon" aria-label={t(locale, "admin.removeMedia")} onClick={() => setField("media", form.media.filter((_, current) => current !== index))}><Trash2 size={16} /></button></div>
              <label className="form-field"><span>{t(locale, "admin.videoUrl")}</span><input type="url" value={item.video_url || ""} onChange={(event) => setField("media", form.media.map((current, i) => i === index ? { ...current, video_url: event.target.value || null } : current))} placeholder="https://" /></label>
              <LocalizedInput label={t(locale, "detail.video")} value={localizedFrom(item, "title")} onChange={(value) => setField("media", form.media.map((current, i) => i === index ? mergeLocalized(current, "title", value) : current))} maxLength={240} />
              <label className="check-control"><input type="checkbox" checked={item.is_public_approved} onChange={(event) => setField("media", form.media.map((current, i) => i === index ? { ...current, is_public_approved: event.target.checked } : current))} /><span>{t(locale, "admin.approveMedia")}</span></label>
            </div>;
          })}
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading"><span className="form-section-number">04</span><div><h2>{t(locale, "admin.tagsLabel")}</h2><p>{t(locale, "admin.categories")}</p></div></div>
          <LocalizedInput label={t(locale, "admin.tagsLabel")} value={{ en: form.tagEn, ar: form.tagAr, it: form.tagIt }} onChange={(value) => setForm((current) => ({ ...current, tagEn: value.en, tagAr: value.ar, tagIt: value.it }))} multiline maxLength={900} />
          <p className="form-help">{t(locale, "admin.listHelp")}</p>
          <LocalizedInput label={t(locale, "admin.categories")} value={{ en: form.categoryEn, ar: form.categoryAr, it: form.categoryIt }} onChange={(value) => setForm((current) => ({ ...current, categoryEn: value.en, categoryAr: value.ar, categoryIt: value.it }))} multiline maxLength={500} />
          <p className="form-help">{t(locale, "admin.listHelp")}</p>
          <div className="media-list-heading"><h3>{t(locale, "admin.technicalSpecifications")}</h3><button type="button" className="button button-outline-dark button-small" onClick={() => setField("specifications", [...form.specifications, { id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: emptyLocalized(), value: emptyLocalized() }])}><Plus size={15} />{t(locale, "admin.addSpecification")}</button></div>
          {form.specifications.map((specification, index) => <div className="media-editor-card" key={specification.id}>
            <div className="media-editor-toolbar"><span>{t(locale, "admin.specificationLabel")} {index + 1}</span><button type="button" className="icon-button danger-icon" aria-label={t(locale, "admin.removeMedia")} onClick={() => setField("specifications", form.specifications.filter((item) => item.id !== specification.id))}><Trash2 size={16} /></button></div>
            <LocalizedInput label={t(locale, "admin.specificationLabel")} value={specification.label} onChange={(label) => setField("specifications", form.specifications.map((item) => item.id === specification.id ? { ...item, label } : item))} required maxLength={120} />
            <LocalizedInput label={t(locale, "admin.specificationValue")} value={specification.value} onChange={(value) => setField("specifications", form.specifications.map((item) => item.id === specification.id ? { ...item, value } : item))} required multiline maxLength={1000} />
          </div>)}
          <div className="media-list-heading"><h3>{t(locale, "admin.awardsSection")}</h3><button type="button" className="button button-outline-dark button-small" onClick={() => setField("awards", [...form.awards, { title_en: "", title_ar: "", title_it: "", issuer_en: "", issuer_ar: "", issuer_it: "", award_date: "", verified: false }])}><Plus size={15} />{t(locale, "admin.addAward")}</button></div>
          {form.awards.map((award, index) => <div className="media-editor-card" key={`award-${index}`}>
            <div className="media-editor-toolbar"><span>{t(locale, "admin.awardsSection")}</span><button type="button" className="icon-button danger-icon" aria-label={t(locale, "admin.removeMedia")} onClick={() => setField("awards", form.awards.filter((_, current) => current !== index))}><Trash2 size={16} /></button></div>
            <LocalizedInput label={t(locale, "admin.awardTitle")} value={{ en: award.title_en, ar: award.title_ar, it: award.title_it }} onChange={(value) => setField("awards", form.awards.map((item, i) => i === index ? { ...item, title_en: value.en, title_ar: value.ar, title_it: value.it } : item))} maxLength={240} />
            <LocalizedInput label={t(locale, "admin.awardIssuer")} value={{ en: award.issuer_en, ar: award.issuer_ar, it: award.issuer_it }} onChange={(value) => setField("awards", form.awards.map((item, i) => i === index ? { ...item, issuer_en: value.en, issuer_ar: value.ar, issuer_it: value.it } : item))} maxLength={240} />
            <div className="form-grid-two"><label className="form-field"><span>{t(locale, "admin.awardDate")}</span><input type="date" value={award.award_date} onChange={(event) => setField("awards", form.awards.map((item, i) => i === index ? { ...item, award_date: event.target.value } : item))} /></label><label className="check-control"><input type="checkbox" checked={award.verified} onChange={(event) => setField("awards", form.awards.map((item, i) => i === index ? { ...item, verified: event.target.checked } : item))} /><span>{t(locale, "admin.awardWinning")}</span></label></div>
          </div>)}
        </section>
        {error && <p className="form-error admin-form-error" role="alert">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="button button-outline-dark" onClick={() => setPreviewOpen(true)}><Eye size={16} />{t(locale, "admin.preview")}</button>
          <button type="submit" className="button button-red" disabled={loading}>{loading ? t(locale, "common.saving") : t(locale, "admin.saveProject")} <ArrowUpRight size={16} /></button>
        </div>
      </form>
      {previewOpen && <div className="preview-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
        <section className="project-preview-modal" role="dialog" aria-modal="true" aria-labelledby="project-preview-title">
          <div className="preview-modal-head"><div><p className="eyebrow">{t(locale, "admin.preview")}</p><h2 id="project-preview-title">{previewTitle}</h2></div><button type="button" className="icon-button" aria-label={t(locale, "common.close")} onClick={() => setPreviewOpen(false)}><X size={18} /></button></div>
          <div className="preview-modal-body"><span className="status-badge status-draft">{t(locale, "admin.statusDraft")}</span><p>{previewDescription || localizedRecordField({ description_en: form.description.en, description_ar: form.description.ar, description_it: form.description.it }, "description", locale)}</p><div className="tag-list">{localizedList(form.tagEn, form.tagAr, form.tagIt).map((tag) => <span className="tag" key={tag.slug}>{tag[`label_${locale}`] || tag.label_en}</span>)}</div></div>
          <button type="button" className="button button-outline-dark" onClick={() => setPreviewOpen(false)}>{t(locale, "common.close")}</button>
        </section>
      </div>}
    </>
  );
}
