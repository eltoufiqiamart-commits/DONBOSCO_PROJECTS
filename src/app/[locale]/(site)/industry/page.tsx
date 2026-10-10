import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CircleHelp, Handshake } from "lucide-react";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { getPublishedProjectBySlug, searchProjects } from "@/lib/data";
import { EmptyState, Eyebrow, ProjectGrid, SectionHeading } from "@/components/content-cards";
import { InquiryForm } from "@/features/projects/inquiry-form";
import type { Project } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "industry.title"), description: t(locale, "industry.description") };
}

export default async function IndustryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) return null;
  const projectSlugValue = query.project;
  const initialProjectSlug = Array.isArray(projectSlugValue) ? projectSlugValue[0] : projectSlugValue ?? "";
  const [candidateResult, selectedProject] = await Promise.all([
    searchProjects(raw, { industryOnly: true, pageSize: 12, sort: "newest" }),
    initialProjectSlug ? getPublishedProjectBySlug(initialProjectSlug) : Promise.resolve(null),
  ]);
  const inquiryProjects: Project[] = [...candidateResult.items];
  if (selectedProject && !inquiryProjects.some((item) => item.id === selectedProject.id)) inquiryProjects.unshift(selectedProject);

  return (
    <div className="page-shell">
      <section className="industry-intro page-container">
        <div className="industry-intro-copy">
          <Eyebrow>{t(raw, "industry.kicker")}</Eyebrow>
          <h1>{t(raw, "industry.title")}</h1>
          <p>{t(raw, "industry.description")}</p>
          <div className="industry-disclaimer"><CircleHelp size={17} aria-hidden="true" /><span>{t(raw, "industry.noClaims")}</span></div>
        </div>
        <div className="industry-intro-symbol" aria-hidden="true"><span><Handshake size={39} strokeWidth={1.1} /></span><i /><i /><i /></div>
      </section>
      <section className="section-block page-container">
        <SectionHeading eyebrow={t(raw, "projects.kicker")} title={t(raw, "industry.projectsTitle")} />
        {candidateResult.items.length ? <ProjectGrid projects={candidateResult.items} locale={raw} /> : <EmptyState title={t(raw, "home.emptyProjectsTitle")} description={t(raw, "home.emptyProjectsDescription")} />}
      </section>
      <section className="inquiry-section page-container" id="inquiry">
        <div className="inquiry-aside">
          <Eyebrow>{t(raw, "industry.kicker")}</Eyebrow>
          <h2>{t(raw, "industry.inquiryTitle")}</h2>
          <p>{t(raw, "industry.inquiryDescription")}</p>
          <Link className="inquiry-contact-link" href="mailto:info@donboscocairo.org">info@donboscocairo.org <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="inquiry-form-card">
          <InquiryForm locale={raw} projects={inquiryProjects} initialProjectSlug={initialProjectSlug} />
        </div>
      </section>
    </div>
  );
}
