import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Wrench, Compass } from "lucide-react";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { Eyebrow } from "@/components/content-cards";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "about.title"), description: t(locale, "about.description") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const highlights = [
    { icon: Compass, title: t(raw, "about.heritageTitle"), text: t(raw, "about.heritageDescription"), mark: "01" },
    { icon: BookOpen, title: t(raw, "about.visionTitle"), text: t(raw, "about.visionDescription"), mark: "02" },
    { icon: Wrench, title: t(raw, "about.missionTitle"), text: t(raw, "about.missionDescription"), mark: "03" },
  ];
  return (
    <div className="page-shell">
      <section className="page-intro page-container">
        <Eyebrow>{t(raw, "about.kicker")}</Eyebrow>
        <h1>{t(raw, "about.title")}</h1>
        <p>{t(raw, "about.description")}</p>
      </section>
      <section className="about-heritage page-container">
        <div className="about-century-mark"><span>1926</span><i /><span>2026</span></div>
        <div className="about-heritage-copy">
          <Eyebrow>{t(raw, "footer.institute")}</Eyebrow>
          <h2>{t(raw, "about.heritageTitle")}</h2>
          <p>{t(raw, "about.heritageDescription")}</p>
          <a className="text-link" href="https://donboscocairo.org/" target="_blank" rel="noreferrer">{t(raw, "about.officialWebsite")} <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
      <section className="about-pillars page-container">
        {highlights.map(({ icon: Icon, title, text, mark }) => (
          <article className="about-pillar" key={mark}>
            <div className="about-pillar-top"><span>{mark}</span><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></div>
            <h2>{title}</h2><p>{text}</p>
          </article>
        ))}
      </section>
      <section className="about-cta page-container">
        <p>{t(raw, "home.finalDescription")}</p>
        <Link className="button button-red" href={`/${raw}/projects`}>{t(raw, "common.exploreProjects")} <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
