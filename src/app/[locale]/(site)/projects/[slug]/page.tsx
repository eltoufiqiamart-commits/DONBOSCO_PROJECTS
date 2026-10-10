import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, Play, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { t } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/locales";
import { getPublishedProjectBySlug, searchProjects } from "@/lib/data";
import { publicMediaEndpoint } from "@/lib/storage-urls";
import { localizedDepartmentName } from "@/lib/departments";
import { localizedField, type Project, type ProjectMedia } from "@/types/domain";
import { SmartImage } from "@/components/smart-image";
import { Eyebrow, ProjectGrid } from "@/components/content-cards";
import { ProjectViewTracker } from "@/features/projects/project-view-tracker";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return { title: t(locale, "error.notFoundTitle"), robots: { index: false, follow: false } };
  return {
    title: localizedField(project, "title", locale),
    description: localizedField(project, "short_description", locale) || localizedField(project, "description", locale),
    openGraph: {
      title: localizedField(project, "title", locale),
      description: localizedField(project, "short_description", locale),
      images: project.cover_image_path ? [{ url: publicMediaEndpoint("project-cover", { slug: project.slug, path: project.cover_image_path }) || "/images/don-bosco-campus.webp" }] : ["/images/don-bosco-campus.webp"],
    },
    alternates: { canonical: `/${locale}/projects/${project.slug}` },
    robots: { index: true, follow: true },
  };
}

function DetailSection({ title, content, id }: { title: string; content?: string | null; id?: string }) {
  if (!content?.trim()) return null;
  return <section className="detail-text-section" id={id}><h2>{title}</h2><div className="detail-prose">{content.split(/\n\n+/).map((paragraph, index) => <p key={`${id ?? title}-${index}`}>{paragraph}</p>)}</div></section>;
}

function industryStatusText(project: Project, locale: Locale) {
  if (project.industry_status === "seeking_partner") return t(locale, "detail.industrySeeking");
  if (project.industry_status === "suitable") return t(locale, "detail.industrySuitable");
  if (project.industry_status === "in_development") return t(locale, "detail.industryDevelopment");
  return "";
}

function localizedSpecification(value: unknown, locale: Locale): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const chosen = [record[locale], record.en, record.ar, record.it].find((item) => typeof item === "string" && item.trim());
  return typeof chosen === "string" ? chosen.trim() : "";
}

function MediaCaption({ media, locale }: { media: ProjectMedia; locale: Locale }) {
  const caption = localizedField(media, "caption", locale);
  const title = localizedField(media, "title", locale);
  return (caption || title) ? <figcaption>{caption || title}</figcaption> : null;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) notFound();
  const title = localizedField(project, "title", locale) || project.slug;
  const intro = localizedField(project, "short_description", locale) || localizedField(project, "description", locale);
  const tags = project.tags ?? [];
  const media = project.media ?? [];
  const gallery = media.filter((item) => item.kind === "image" && item.is_public_approved && item.object_path);
  const documents = media.filter((item) => item.kind === "document" && item.is_public_approved);
  const videos = media.filter((item) => item.kind === "video" && item.video_url && item.is_public_approved);
  const date = project.completion_date ? new Date(`${project.completion_date}T00:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : null;
  const teamMembers = project.team?.members ?? [];
  const relatedResult = project.department?.slug ? await searchProjects(locale, { department: project.department.slug, pageSize: 4, sort: "newest" }) : { items: [], total: 0, page: 1, pageSize: 4, configured: true };
  const related = relatedResult.items.filter((item) => item.id !== project.id).slice(0, 3);

  return (
    <article className="project-detail page-shell">
      <ProjectViewTracker slug={project.slug} />
      <div className="page-container detail-breadcrumbs">
        <Link href={`/${locale}/projects`} className="back-link"><ArrowLeft size={16} aria-hidden="true" />{t(locale, "nav.projects")}</Link>
        <span aria-hidden="true">/</span><span>{t(locale, "detail.breadcrumb")}</span>
      </div>
      <header className="detail-header page-container">
        <div className="detail-header-copy">
          <Eyebrow>{project.department ? localizedDepartmentName(project.department, locale) : t(locale, "nav.projects")}</Eyebrow>
          <h1>{title}</h1>
          {intro && <p className="detail-lede">{intro}</p>}
          <div className="detail-header-meta">
            <span>{project.graduation_year}</span>
            {project.team && <><span className="meta-dot" aria-hidden="true" /><span>{localizedField(project.team, "name", locale)}</span></>}
            {project.featured && <span className="badge badge-red">{t(locale, "projects.featuredBadge")}</span>}
            {project.award_winning && <span className="badge badge-gold">{t(locale, "projects.awardBadge")}</span>}
          </div>
          {industryStatusText(project, locale) && <p className="detail-industry-status"><span className="status-dot" aria-hidden="true" />{industryStatusText(project, locale)}</p>}
        </div>
        <div className="detail-cover-wrap">
          <SmartImage bucket="project-covers" path={project.cover_image_path} alt={localizedField(project, "cover_alt", locale) || title} entity="project-cover" slug={project.slug} className="detail-cover-image" sizes="(max-width: 900px) 100vw, 55vw" priority fallbackLabel={t(locale, "common.noImage")} />
        </div>
      </header>
      <div className="detail-layout page-container">
        <div className="detail-main">
          <DetailSection title={t(locale, "detail.introduction")} content={localizedField(project, "description", locale)} id="overview" />
          <DetailSection title={t(locale, "detail.problem")} content={localizedField(project, "problem_statement", locale)} id="problem" />
          <DetailSection title={t(locale, "detail.objectives")} content={localizedField(project, "objectives", locale)} id="objectives" />
          <DetailSection title={t(locale, "detail.solution")} content={localizedField(project, "proposed_solution", locale)} id="solution" />
          <DetailSection title={t(locale, "detail.implementation")} content={localizedField(project, "technical_implementation", locale)} id="implementation" />

          {gallery.length > 0 && (
            <section className="detail-text-section detail-gallery-section">
              <h2>{t(locale, "detail.gallery")}</h2>
              <div className="detail-gallery-grid">
                {gallery.map((item) => <figure key={item.id}>
                  <SmartImage bucket={item.bucket_name || "project-gallery"} path={item.object_path} alt={localizedField(item, "alt", locale) || localizedField(item, "title", locale) || title} entity="project-gallery" slug={project.slug} mediaId={item.id} className="detail-gallery-image" sizes="(max-width: 650px) 100vw, 50vw" />
                  <MediaCaption media={item} locale={locale} />
                </figure>)}
              </div>
            </section>
          )}

          {videos.length > 0 && <section className="detail-text-section"><h2>{t(locale, "detail.video")}</h2><div className="detail-media-links">{videos.map((video) => <a key={video.id} href={video.video_url ?? undefined} target="_blank" rel="noreferrer"><span><Play size={17} aria-hidden="true" /></span>{localizedField(video, "title", locale) || t(locale, "detail.video")}<ArrowUpRight size={15} aria-hidden="true" /></a>)}</div></section>}

          {documents.length > 0 && <section className="detail-text-section"><h2>{t(locale, "detail.documents")}</h2><div className="detail-media-links">{documents.map((document) => <a key={document.id} href={`/api/public/documents/${document.id}`} target="_blank" rel="noreferrer"><span><FileText size={17} aria-hidden="true" /></span>{localizedField(document, "title", locale) || t(locale, "detail.documents")}<ArrowUpRight size={15} aria-hidden="true" /></a>)}</div></section>}

          {project.awards?.length ? <section className="detail-text-section"><h2>{t(locale, "detail.awards")}</h2><ul className="detail-award-list">{project.awards.map((award) => <li key={award.id}><ShieldCheck size={18} aria-hidden="true" /><div><strong>{localizedField(award, "title", locale)}</strong>{localizedField(award, "issuer", locale) && <span>{localizedField(award, "issuer", locale)}</span>}</div></li>)}</ul></section> : null}
        </div>

        <aside className="detail-sidebar" aria-label={t(locale, "detail.breadcrumb")}>
          <div className="detail-facts-card">
            <h2>{t(locale, "detail.breadcrumb")}</h2>
            <dl>
              {project.department && <div><dt>{t(locale, "common.department")}</dt><dd>{localizedDepartmentName(project.department, locale)}</dd></div>}
              <div><dt>{t(locale, "common.year")}</dt><dd>{project.graduation_year}</dd></div>
              {project.academic_program_en && <div><dt>{t(locale, "detail.program")}</dt><dd>{localizedField(project, "academic_program", locale)}</dd></div>}
              {project.project_duration_en && <div><dt>{t(locale, "detail.duration")}</dt><dd>{localizedField(project, "project_duration", locale)}</dd></div>}
              {date && <div><dt>{t(locale, "detail.completion")}</dt><dd>{date}</dd></div>}
              {industryStatusText(project, locale) && <div><dt>{t(locale, "detail.industryStatus")}</dt><dd>{industryStatusText(project, locale)}</dd></div>}
            </dl>
            {tags.length > 0 && <div className="detail-tags"><h3>{t(locale, "detail.tools")}</h3><div className="tag-list">{tags.map((tag) => <span className="tag" key={tag.slug}>{localizedField(tag, "label", locale) || tag.label_en}</span>)}</div></div>}
            <p className="detail-privacy-note"><ShieldCheck size={15} aria-hidden="true" />{t(locale, "detail.privateDataNote")}</p>
            <Link href={`/${locale}/industry?project=${encodeURIComponent(project.slug)}#inquiry`} className="button button-red detail-inquiry-link">{t(locale, "detail.inquiry")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          {project.technical_specifications && Object.keys(project.technical_specifications).length > 0 && (
            <div className="detail-facts-card"><h2>{t(locale, "detail.specifications")}</h2><dl>{Object.entries(project.technical_specifications).map(([key, rawValue]) => {
              const value = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue as Record<string, unknown> : null;
              const label = value?.label ? localizedSpecification(value.label, locale) : key;
              const detail = value?.value ? localizedSpecification(value.value, locale) : typeof rawValue === "string" ? rawValue : "";
              return label && detail ? <div key={key}><dt>{label}</dt><dd>{detail}</dd></div> : null;
            })}</dl></div>
          )}
          {teamMembers.length > 0 && (
            <div className="detail-facts-card detail-team-card"><h2>{t(locale, "detail.team")}</h2><ul>{teamMembers.map((member) => <li key={member.id}>{localizedField(member, "display_name", locale)}</li>)}</ul></div>
          )}
        </aside>
      </div>
      {related.length > 0 && <section className="section-block section-block--soft"><div className="page-container"><div className="catalog-section-heading"><Eyebrow>{t(locale, "detail.related")}</Eyebrow><h2>{t(locale, "detail.related")}</h2></div><ProjectGrid projects={related} locale={locale} /></div></section>}
      <div className="detail-bottom-link page-container"><Link href={`/${locale}/projects`} className="text-link"><ArrowLeft size={16} aria-hidden="true" />{t(locale, "nav.projects")}</Link></div>
    </article>
  );
}
