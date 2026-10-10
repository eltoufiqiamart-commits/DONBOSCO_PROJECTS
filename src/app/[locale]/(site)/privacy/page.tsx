import type { Metadata } from "next";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { Eyebrow } from "@/components/content-cards";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "privacy.title"), description: t(locale, "privacy.description"), robots: { index: true, follow: true } };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const blocks = [
    ["privacy.dataTitle", "privacy.dataDescription"],
    ["privacy.inquiryTitle", "privacy.inquiryDescription"],
    ["privacy.contactTitle", "privacy.contactDescription"],
  ] as const;
  return (
    <div className="page-shell">
      <section className="page-intro page-container"><Eyebrow>{t(raw, "site.name")}</Eyebrow><h1>{t(raw, "privacy.title")}</h1><p>{t(raw, "privacy.description")}</p></section>
      <section className="privacy-content page-container">
        {blocks.map(([title, description], index) => <article key={title}><span className="privacy-number">0{index + 1}</span><div><h2>{t(raw, title)}</h2><p>{t(raw, description)}</p></div></article>)}
      </section>
    </div>
  );
}
