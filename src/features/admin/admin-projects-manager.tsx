"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Edit3, Eye, FolderKanban, Search, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedDepartmentName } from "@/lib/departments";
import { localizedField, type Project, type ProjectStatus } from "@/types/domain";

const statusKeys: Record<ProjectStatus, Parameters<typeof t>[1]> = {
  draft: "admin.statusDraft", pending: "admin.statusPending", published: "admin.statusPublished", rejected: "admin.statusRejected", archived: "admin.statusArchived",
};
const actions: Array<{ action: string; key: Parameters<typeof t>[1] }> = [
  { action: "publish", key: "admin.actionPublish" },
  { action: "unpublish", key: "admin.actionUnpublish" },
  { action: "approve", key: "admin.actionApprove" },
  { action: "request_revision", key: "admin.actionRequestRevision" },
  { action: "reject", key: "admin.actionReject" },
  { action: "archive", key: "admin.actionArchive" },
  { action: "restore", key: "admin.actionRestore" },
];

export function AdminProjectsManager({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async (nextPage: number, search: string, nextStatus: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(nextPage) });
    if (search.trim()) params.set("q", search.trim());
    if (nextStatus) params.set("status", nextStatus);
    try {
      const response = await fetch(`/api/admin/projects?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error("load_failed");
      setItems(result.items ?? []);
      setTotal(Number(result.total) || 0);
      setPage(nextPage);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setError(t(locale, "admin.errorLoading"));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(1, query, status); }, query.trim() ? 260 : 80);
    return () => { window.clearTimeout(timer); requestRef.current?.abort(); };
  }, [load, query, status]);

  async function changeStatus(project: Project, action: string) {
    if (action === "archive" && !window.confirm(t(locale, "admin.confirmAction"))) return;
    setPendingId(project.id);
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error("status_failed");
      await load(page, query, status);
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setPendingId(""); }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(t(locale, "admin.confirmDelete"))) return;
    setPendingId(project.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      const result = await response.json();
      await load(Math.max(1, page), query, status);
      if (result.cleanupPending) setNotice(t(locale, "admin.mediaCleanupPending"));
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setPendingId(""); }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="admin-projects-manager">
      <div className="admin-table-toolbar">
        <label className="admin-search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">{t(locale, "common.search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(locale, "admin.searchProjects")} maxLength={120} /></label>
        <label className="admin-status-filter"><span>{t(locale, "common.status")}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t(locale, "admin.allStatuses")}</option>{(Object.keys(statusKeys) as ProjectStatus[]).map((value) => <option key={value} value={value}>{t(locale, statusKeys[value])}</option>)}</select></label>
        <span className="admin-table-count">{total.toLocaleString()} {t(locale, "admin.projectCount")}</span>
      </div>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {notice && <p className="admin-inline-notice" role="status">{notice}</p>}
      {loading ? <div className="admin-loading-state">{t(locale, "common.loading")}</div> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{t(locale, "admin.projectTitle")}</th><th>{t(locale, "common.department")}</th><th>{t(locale, "common.year")}</th><th>{t(locale, "common.status")}</th><th>{t(locale, "common.updated")}</th><th><span className="sr-only">{t(locale, "admin.manageProjects")}</span></th></tr></thead>
            <tbody>{items.map((project) => {
              const dept = project.department ? localizedDepartmentName(project.department, locale) : "—";
              const title = localizedField(project, "title", locale) || project.slug;
              const updated = project.updated_at ? new Date(project.updated_at).toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB") : "—";
              const allowedActions = actions.filter(({ action }) => {
                if (action === "unpublish") return project.status === "published";
                if (action === "archive") return project.status !== "archived";
                if (action === "restore") return project.status === "archived";
                if (action === "approve") return project.status === "pending";
                if (action === "request_revision" || action === "reject") return project.status === "pending";
                if (action === "publish") return project.status !== "published" && project.status !== "archived";
                return false;
              });
              return <tr key={project.id}>
                <td><Link className="admin-project-title-link" href={`/${locale}/admin/projects/${project.id}`}><strong>{title}</strong><span>{project.slug}</span></Link></td>
                <td>{dept}</td><td>{project.graduation_year}</td><td><span className={`status-badge status-${project.status}`}>{t(locale, statusKeys[project.status])}</span></td><td>{updated}</td>
                <td><div className="admin-row-actions">
                  {project.status === "published" && <Link className="icon-button" href={`/${locale}/projects/${project.slug}`} target="_blank" aria-label={`${t(locale, "admin.actionPreview")}: ${title}`}><Eye size={16} /></Link>}
                  <Link className="icon-button" href={`/${locale}/admin/projects/${project.id}`} aria-label={`${t(locale, "common.edit")}: ${title}`}><Edit3 size={16} /></Link>
                  {allowedActions.map(({ action, key }) => <button key={action} type="button" className="admin-action-compact" disabled={pendingId === project.id} onClick={() => void changeStatus(project, action)}>{t(locale, key)}</button>)}
                  <button type="button" className="icon-button danger-icon" aria-label={`${t(locale, "common.delete")}: ${title}`} disabled={pendingId === project.id} onClick={() => void deleteProject(project)}><Trash2 size={16} /></button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : <div className="admin-empty-card"><FolderKanban size={22} aria-hidden="true" /><p>{t(locale, "admin.noProjects")}</p></div>}
      {totalPages > 1 && <nav className="pagination admin-pagination" aria-label={t(locale, "admin.projects")}>
        <button className="pagination-button" disabled={page <= 1 || loading} onClick={() => void load(page - 1, query, status)}>{locale === "ar" ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}<span>{t(locale, "common.previous")}</span></button>
        <span>{t(locale, "common.page")} <strong>{page}</strong> {t(locale, "common.of")} {totalPages}</span>
        <button className="pagination-button" disabled={page >= totalPages || loading} onClick={() => void load(page + 1, query, status)}><span>{t(locale, "common.next")}</span>{locale === "ar" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</button>
      </nav>}
    </div>
  );
}
