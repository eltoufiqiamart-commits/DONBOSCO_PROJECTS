import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ChevronDown, CircuitBoard, Handshake, Microscope } from "lucide-react";
import { getDictionary, t } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/locales";
import { defaultDepartments } from "@/lib/departments";
import { getDepartments, getFeaturedProjects, getLatestProjects, getPublicStatistics, getPublicTeams, getSiteContents } from "@/lib/data";
import { DepartmentCard, EmptyState, Eyebrow, ProjectGrid, SectionHeading, TeamCard } from "@/components/content-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === "ar" || raw === "it" ? raw : "en";
  return { title: t(locale, "site.name"), description: t(locale, "hero.description"), alternates: { canonical: `/${locale}`, languages: { en: "/en", ar: "/ar", it: "/it" } } };
}

function contentValue(content: Record<string, Record<string, string | null>>, key: string, locale: Locale, fallback: string) {
  const row = content[key];
  const localized = row?.[`content_${locale}`]?.trim();
  const english = row?.content_en?.trim();
  return localized || english || fallback;
}

function HomeStats({ locale, stats }: { locale: Locale; stats: Awaited<ReturnType<typeof getPublicStatistics>> }) {
  const rows = [
    [stats.visible.projects, stats.publishedProjects, t(locale, "home.statProjects")],
    [stats.visible.departments, stats.departments, t(locale, "home.statDepartments")],
    [stats.visible.teams, stats.publicTeams, t(locale, "home.statTeams")],
    [stats.visible.years, stats.graduationYears, t(locale, "home.statYears")],
  ].filter(([visible, value]) => visible === true && Number(value) > 0) as Array<[boolean, number, string]>;
  if (!rows.length) return null;
  return (
    <section className="stats-section page-container">
      <div className="stats-intro"><Eyebrow>{t(locale, "home.statsEyebrow")}</Eyebrow><h2>{t(locale, "home.statsTitle")}</h2></div>
      <div className="stats-grid">
        {rows.map(([, value, label]) => <div className="stat-item" key={label}><strong>{value.toLocaleString(locale === "ar" ? "ar-EG" : locale === "it" ? "it-IT" : "en-GB")}</strong><span>{label}</span></div>)}
      </div>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [departmentData, featured, latestRows, teams, stats, content] = await Promise.all([
    getDepartments(),
    getFeaturedProjects(3),
    getLatestProjects(6),
    getPublicTeams(3),
    getPublicStatistics(),
    getSiteContents(["home.hero_title", "home.hero_description", "home.industry_title", "home.industry_description", "home.final_title", "home.final_description"]),
  ]);
  const departments = departmentData.items.length ? departmentData.items : defaultDepartments();
  const featuredIds = new Set(featured.map((project) => project.id));
  const latest = latestRows.filter((project) => !featuredIds.has(project.id)).slice(0, 3);
  const hasProjectContent = featured.length > 0 || latest.length > 0;
  const heroTitle = contentValue(content, "home.hero_title", locale, dictionary["hero.title"]);
  const heroDescription = contentValue(content, "home.hero_description", locale, dictionary["hero.description"]);
  const industryTitle = contentValue(content, "home.industry_title", locale, dictionary["home.industryTitle"]);
  const industryDescription = contentValue(content, "home.industry_description", locale, dictionary["home.industryDescription"]);
  const finalTitle = contentValue(content, "home.final_title", locale, dictionary["home.finalTitle"]);
  const finalDescription = contentValue(content, "home.final_description", locale, dictionary["home.finalDescription"]);

  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-image" aria-hidden="true">
          <Image src="/images/don-bosco-campus.webp" alt="" fill priority sizes="100vw" className="home-campus-image" />
        </div>
        <div className="home-hero-overlay" aria-hidden="true" />
        <div className="home-hero-content page-container">
          <div className="hero-copy">
            <Eyebrow light>{t(locale, "hero.kicker")}</Eyebrow>
            <h1 id="home-title">{heroTitle}</h1>
            <p className="hero-description">{heroDescription}</p>
            <div className="hero-actions">
              <Link className="button button-red" href={`/${locale}/projects`}>{t(locale, "common.exploreProjects")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link className="button button-outline-light" href={`/${locale}/departments`}>{t(locale, "common.discoverDepartments")}</Link>
            </div>
          </div>
          <div className="hero-caption">
            <span className="hero-caption-line" aria-hidden="true" />
            <span>{t(locale, "hero.note")}</span>
            <span className="hero-caption-year">1926—2026</span>
          </div>
        </div>
        <a href="#discover" className="hero-scroll-cue" aria-label={t(locale, "common.learnMore")}><ChevronDown size={18} aria-hidden="true" /></a>
        <div className="hero-bottom-fade" aria-hidden="true" />
      </section>

      <div id="discover" className="home-content">
        {featured.length > 0 && (
          <section className="section-block page-container">
            <SectionHeading
              eyebrow={t(locale, "home.featuredEyebrow")}
              title={t(locale, "home.featuredTitle")}
              description={t(locale, "home.featuredDescription")}
              action={<Link href={`/${locale}/projects?featured=true`} className="text-link">{t(locale, "common.viewAll")} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            />
            <ProjectGrid projects={featured} locale={locale} />
          </section>
        )}

        {latest.length > 0 && (
          <section className="section-block section-block--soft page-container">
            <SectionHeading
              eyebrow={t(locale, "home.latestEyebrow")}
              title={t(locale, "home.latestTitle")}
              description={t(locale, "home.latestDescription")}
              action={<Link href={`/${locale}/projects`} className="text-link">{t(locale, "common.viewAll")} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            />
            <ProjectGrid projects={latest} locale={locale} />
          </section>
        )}

        {!hasProjectContent && (
          <section className="section-block page-container">
            <SectionHeading eyebrow={t(locale, "home.latestEyebrow")} title={t(locale, "home.latestTitle")} description={t(locale, "home.latestDescription")} />
            <EmptyState title={t(locale, "home.emptyProjectsTitle")} description={t(locale, "home.emptyProjectsDescription")} />
          </section>
        )}

        <section className="section-block departments-section page-container">
          <SectionHeading eyebrow={t(locale, "home.departmentsEyebrow")} title={t(locale, "home.departmentsTitle")} description={t(locale, "home.departmentsDescription")} />
          <div className="department-grid">
            {departments.map((department, index) => <DepartmentCard key={department.slug} department={department} locale={locale} index={index} />)}
          </div>
        </section>

        {teams.length > 0 && (
          <section className="section-block section-block--soft page-container">
            <SectionHeading
              eyebrow={t(locale, "home.teamsEyebrow")}
              title={t(locale, "home.teamsTitle")}
              description={t(locale, "home.teamsDescription")}
              action={<Link href={`/${locale}/teams`} className="text-link">{t(locale, "common.viewAll")} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            />
            <div className="team-grid">{teams.map((team) => <TeamCard key={team.id} team={team} locale={locale} />)}</div>
          </section>
        )}

        <HomeStats locale={locale} stats={stats} />

        <section className="industry-band page-container">
          <div className="industry-band-copy">
            <Eyebrow light>{t(locale, "home.industryEyebrow")}</Eyebrow>
            <h2>{industryTitle}</h2>
            <p>{industryDescription}</p>
            <Link className="button button-gold" href={`/${locale}/industry`}>{t(locale, "home.industryCta")} <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="industry-band-visual" aria-hidden="true">
            <div className="innovation-graphic">
              <div className="innovation-rings"><span /><span /><span /></div>
              <div className="innovation-grid" />
              <CircuitBoard className="innovation-icon" size={88} strokeWidth={0.75} />
              <div className="innovation-mark"><Microscope size={18} /><Handshake size={18} /></div>
            </div>
            <span className="industry-coordinate">31° 15′ E&nbsp; / &nbsp;30° 06′ N</span>
          </div>
        </section>

        <section className="final-cta page-container">
          <div><Eyebrow>{t(locale, "home.finalTitle")}</Eyebrow><h2>{finalTitle}</h2><p>{finalDescription}</p></div>
          <Link href={`/${locale}/projects`} className="round-cta" aria-label={t(locale, "common.exploreProjects")}><ArrowUpRight size={25} aria-hidden="true" /></Link>
        </section>
      </div>
    </>
  );
}
