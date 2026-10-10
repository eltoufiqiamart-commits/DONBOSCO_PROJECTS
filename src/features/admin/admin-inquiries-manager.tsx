"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Search } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedField } from "@/types/domain";

type Inquiry = { id: string; organization: string; contact_name: string; email: string; category: string; message: string; status: "new" | "read" | "responded" | "archived"; created_at: string; project?: { slug: string; title_en: string; title_ar: string | null; title_it: string | null } | null };
const statusText = { new: "admin.inquiryNew", read: "admin.inquiryRead", responded: "admin.inquiryResponded", archived: "admin.inquiryArchived" } as const;

export function AdminInquiriesManager({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/inquiries", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error("load_failed");
      setItems(result.inquiries ?? []);
    }).catch(() => { if (!controller.signal.aborted) setError(t(locale, "admin.errorLoading")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [locale]);

  async function updateStatus(item: Inquiry, nextStatus: Inquiry["status"]) {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/inquiries/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error("status_failed");
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: nextStatus } : row));
    } catch { setError(t(locale, "admin.projectSaveError")); }
    finally { setBusyId(""); }
  }

  const visible = useMemo(() => items.filter((item) => {
    const matchesStatus = !status || item.status === status;
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch = !term || [item.organization, item.contact_name, item.email, item.message, item.project?.title_en, item.project?.title_ar, item.project?.title_it].some((value) => value?.toLocaleLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [items, search, status]);
  const categoryText = (category: string) => category === "project" ? t(locale, "industry.categoryProject") : category === "applied" ? t(locale, "industry.categoryApplied") : t(locale, "industry.categoryGeneral");

  return (
    <div className="admin-inquiries-manager">
      <div className="admin-table-toolbar"><label className="admin-search-field"><Search size={17} /><span className="sr-only">{t(locale, "common.search")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t(locale, "common.search")} /></label><label className="admin-status-filter"><span>{t(locale, "common.status")}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t(locale, "admin.allInquiries")}</option>{(Object.keys(statusText) as Array<Inquiry["status"]>).map((value) => <option key={value} value={value}>{t(locale, statusText[value])}</option>)}</select></label><span className="admin-table-count">{visible.length}</span></div>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {loading ? <div className="admin-loading-state">{t(locale, "common.loading")}</div> : visible.length ? <div className="inquiry-admin-list">{visible.map((item) => <article className="admin-inquiry-card" key={item.id}>
        <div className="admin-inquiry-top"><div><p className="eyebrow">{item.organization}</p><h2>{item.contact_name}</h2><a href={`mailto:${item.email}`}>{item.email}</a></div><div className="admin-inquiry-badges"><span className={`status-badge inquiry-status-${item.status}`}>{t(locale, statusText[item.status])}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></div></div>
        <dl className="admin-inquiry-meta"><div><dt>{t(locale, "admin.inquiryCategory")}</dt><dd>{categoryText(item.category)}</dd></div>{item.project && <div><dt>{t(locale, "industry.relatedProject")}</dt><dd>{localizedField(item.project, "title", locale) || item.project.slug}</dd></div>}</dl>
        <p className="admin-inquiry-message">{item.message}</p>
        <div className="admin-inquiry-actions"><a className="button button-outline-dark button-small" href={`mailto:${item.email}?subject=${encodeURIComponent(t(locale, "admin.inquirySubject"))}`}><Mail size={15} />{t(locale, "admin.inquiryEmail")}</a>{item.status === "new" && <button type="button" className="button button-outline-dark button-small" disabled={busyId === item.id} onClick={() => void updateStatus(item, "read")}>{t(locale, "admin.inquiryMarkRead")}</button>}{item.status !== "responded" && item.status !== "archived" && <button type="button" className="button button-red button-small" disabled={busyId === item.id} onClick={() => void updateStatus(item, "responded")}>{t(locale, "admin.inquiryMarkResponded")}</button>}{item.status !== "archived" && <button type="button" className="text-link" disabled={busyId === item.id} onClick={() => void updateStatus(item, "archived")}>{t(locale, "admin.inquiryArchive")}</button>}</div>
      </article>)}</div> : <div className="admin-empty-card"><Mail size={21} aria-hidden="true" /><p>{t(locale, "admin.noInquiries")}</p></div>}
    </div>
  );
}
