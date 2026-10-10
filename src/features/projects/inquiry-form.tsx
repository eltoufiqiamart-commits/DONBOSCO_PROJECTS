"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import type { Project } from "@/types/domain";

export function InquiryForm({ locale, projects, initialProjectSlug = "" }: { locale: Locale; projects: Project[]; initialProjectSlug?: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());
    if (!data.get("consent")) {
      setFieldError(t(locale, "industry.consentRequired"));
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organization: values.organization,
          contactName: values.contactName,
          email: values.email,
          category: values.category,
          projectSlug: values.projectSlug || null,
          message: values.message,
          consent: Boolean(data.get("consent")),
          website: values.website,
        }),
      });
      await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) setError(t(locale, "industry.error"));
        else setError(t(locale, "industry.error"));
        return;
      }
      setSent(true);
      form.reset();
    } catch {
      setError(t(locale, "industry.error"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="form-success" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <div><h3>{t(locale, "industry.successTitle")}</h3><p>{t(locale, "industry.successDescription")}</p></div>
      </div>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={submit} noValidate>
      <div className="form-grid-two">
        <label className="form-field">
          <span>{t(locale, "industry.organization")} <i aria-hidden="true">*</i></span>
          <input name="organization" required maxLength={160} autoComplete="organization" />
        </label>
        <label className="form-field">
          <span>{t(locale, "industry.contactName")} <i aria-hidden="true">*</i></span>
          <input name="contactName" required maxLength={120} autoComplete="name" />
        </label>
      </div>
      <label className="form-field">
        <span>{t(locale, "industry.email")} <i aria-hidden="true">*</i></span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" />
      </label>
      <div className="form-grid-two">
        <label className="form-field">
          <span>{t(locale, "industry.category")}</span>
          <select name="category" defaultValue="general">
            <option value="general">{t(locale, "industry.categoryGeneral")}</option>
            <option value="project">{t(locale, "industry.categoryProject")}</option>
            <option value="applied">{t(locale, "industry.categoryApplied")}</option>
          </select>
        </label>
        <label className="form-field">
          <span>{t(locale, "industry.relatedProject")}</span>
          <select name="projectSlug" defaultValue={initialProjectSlug}>
            <option value="">{t(locale, "industry.noSpecificProject")}</option>
            {projects.map((project) => <option value={project.slug} key={project.id}>{project.title_en || project.slug}</option>)}
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>{t(locale, "industry.message")} <i aria-hidden="true">*</i></span>
        <textarea name="message" required minLength={20} maxLength={5000} rows={5} />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="check-control consent-control">
        <input type="checkbox" name="consent" value="yes" required />
        <span>{t(locale, "industry.consent")}</span>
      </label>
      {fieldError && <p className="field-error" role="alert">{fieldError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-red form-submit" type="submit" disabled={pending}>
        {pending ? t(locale, "industry.submitting") : t(locale, "industry.submit")} <Send size={17} aria-hidden="true" />
      </button>
      <p className="form-privacy-note">{t(locale, "privacy.inquiryDescription")}</p>
    </form>
  );
}
