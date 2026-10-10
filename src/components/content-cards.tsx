import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Code2, Cog, Zap, type LucideIcon } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { localizedDepartmentDescription, localizedDepartmentName } from "@/lib/departments";
import { localizedField, type Department, type Project, type PublicTeam } from "@/types/domain";
import { SmartImage } from "@/components/smart-image";

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`eyebrow${light ? " eyebrow-light" : ""}`}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-heading-copy">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-heading-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""}`}>
      <span className="empty-state-rule" aria-hidden="true" />
      <div><h3>{title}</h3><p>{description}</p></div>
    </div>
  );
}

export function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const title = localizedField(project, "title", locale) || project.slug;
  const description = localizedField(project, "short_description", locale);
  const department = project.department ? localizedDepartmentName(project.department, locale) : "";
  const tags = (project.tags ?? []).slice(0, 3);
  const isRtl = locale === "ar";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  return (
    <article className="project-card">
      <Link href={`/${locale}/projects/${project.slug}`} className="project-card-image-link" aria-label={`${t(locale, "common.viewProject")}: ${title}`}>
        <SmartImage
          bucket="project-covers"
          path={project.cover_image_path}
          alt={localizedField(project, "cover_alt", locale) || title}
          entity="project-cover"
          slug={project.slug}
          className="project-card-image"
          sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
          fallbackLabel={t(locale, "common.noImage")}
        />
        {(project.featured || project.award_winning || project.industry_status === "seeking_partner") && (
          <div className="project-card-badges" aria-label={t(locale, "projects.tags")}>
            {project.featured && <span className="badge badge-red">{t(locale, "projects.featuredBadge")}</span>}
            {project.award_winning && <span className="badge badge-gold">{t(locale, "projects.awardBadge")}</span>}
            {project.industry_status === "seeking_partner" && <span className="badge badge-light">{t(locale, "projects.partnerBadge")}</span>}
          </div>
        )}
      </Link>
      <div className="project-card-body">
        <div className="project-card-meta">
          {department && <span>{department}</span>}
          <span className="meta-dot" aria-hidden="true" />
          <span>{project.graduation_year}</span>
        </div>
        <h3><Link href={`/${locale}/projects/${project.slug}`}>{title}</Link></h3>
        {description && <p className="project-card-description">{description}</p>}
        <div className="project-card-bottom">
          <div className="tag-list" aria-label={t(locale, "projects.tags")}>
            {tags.map((tag) => <span key={tag.slug} className="tag">{localizedField(tag, "label", locale) || tag.label_en}</span>)}
          </div>
          <Link className="round-arrow-link" href={`/${locale}/projects/${project.slug}`} aria-label={`${t(locale, "common.viewProject")}: ${title}`}>
            <Arrow size={17} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </article>
  );
}

const departmentIcons: Record<string, LucideIcon> = {
  "mechanical-technician": Cog,
  "electrical-technician": Zap,
  "information-technology-technician": Code2,
};

export function DepartmentCard({ department, locale, index = 0 }: { department: Department; locale: Locale; index?: number }) {
  const Icon = departmentIcons[department.slug] ?? Cog;
  const description = localizedDepartmentDescription(department, locale);
  const imagePath = department.cover_image_path;
  const colors = ["department-card--red", "department-card--gold", "department-card--ink", "department-card--olive"];
  return (
    <Link href={`/${locale}/departments/${department.slug}`} className={`department-card ${colors[index % colors.length]}`}>
      <div className="department-card-visual">
        {imagePath ? (
          <SmartImage bucket="department-images" path={imagePath} alt={localizedDepartmentName(department, locale)} entity="department" slug={department.slug} className="department-card-image" sizes="(max-width: 680px) 100vw, 25vw" />
        ) : (
          <div className="department-icon-wrap" aria-hidden="true"><Icon size={31} strokeWidth={1.35} /></div>
        )}
        <span className="department-index">0{index + 1}</span>
      </div>
      <div className="department-card-copy">
        <h3>{localizedDepartmentName(department, locale)}</h3>
        {description && <p>{description}</p>}
        <span className="department-card-link">{t(locale, "common.exploreProjects")} <ArrowUpRight size={17} aria-hidden="true" /></span>
      </div>
    </Link>
  );
}

export function TeamCard({ team, locale }: { team: PublicTeam; locale: Locale }) {
  const name = localizedField(team, "name", locale) || team.slug;
  const description = localizedField(team, "short_description", locale);
  return (
    <article className="team-card">
      <SmartImage bucket="team-images" path={team.image_path} alt={name} entity="team" slug={team.slug} className="team-card-image" sizes="(max-width: 680px) 100vw, 33vw" fallbackLabel={name} />
      <div className="team-card-copy">
        <div className="team-card-meta">
          {team.department && <span>{localizedDepartmentName(team.department, locale)}</span>}
          {team.graduation_year && <span>{team.graduation_year}</span>}
        </div>
        <h3>{name}</h3>
        {description && <p>{description}</p>}
      </div>
    </article>
  );
}

export function ProjectGrid({ projects, locale }: { projects: Project[]; locale: Locale }) {
  if (!projects.length) return null;
  return <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} locale={locale} />)}</div>;
}
