import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MobileNavigation } from "@/components/mobile-navigation";

const navigation = [
  ["nav.home", ""],
  ["nav.projects", "/projects"],
  ["nav.departments", "/departments"],
  ["nav.teams", "/teams"],
  ["nav.industry", "/industry"],
  ["nav.about", "/about"],
] as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="site-header">
      <div className="header-inner page-container">
        <Link href={`/${locale}`} className="brand-lockup" aria-label={`${t(locale, "site.name")} — ${t(locale, "footer.institute")}`}>
          <Image
            src="/images/don-bosco-cairo-centenary.jpeg"
            alt="Don Bosco Cairo centenary emblem"
            width={74}
            height={57}
            className="brand-logo"
            priority
          />
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-institute">DON BOSCO CAIRO</span>
            <span className="brand-platform">PROJECTS</span>
          </span>
        </Link>
        <nav className="desktop-navigation" aria-label={t(locale, "nav.openMenu")}>
          {navigation.map(([key, href]) => (
            <Link key={key} href={`/${locale}${href}`} className="nav-link">
              {t(locale, key)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher locale={locale} compact />
          <MobileNavigation locale={locale} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="site-footer">
      <div className="page-container footer-main">
        <div className="footer-brand">
          <div className="footer-logo-wrap">
            <Image src="/images/don-bosco-cairo-centenary.jpeg" alt="Don Bosco Cairo centenary emblem" width={86} height={66} />
          </div>
          <div>
            <p className="footer-brand-title">{t(locale, "footer.institute")}</p>
            <p className="footer-muted">{t(locale, "footer.location")}</p>
          </div>
        </div>
        <div className="footer-column">
          <h2>{t(locale, "nav.projects")}</h2>
          <Link href={`/${locale}/projects`}>{t(locale, "nav.projects")}</Link>
          <Link href={`/${locale}/departments`}>{t(locale, "nav.departments")}</Link>
          <Link href={`/${locale}/teams`}>{t(locale, "nav.teams")}</Link>
          <Link href={`/${locale}/industry`}>{t(locale, "nav.industry")}</Link>
        </div>
        <div className="footer-column">
          <h2>{t(locale, "nav.about")}</h2>
          <Link href={`/${locale}/about`}>{t(locale, "about.title")}</Link>
          <Link href={`/${locale}/privacy`}>{t(locale, "footer.privacy")}</Link>
          <a href="https://donboscocairo.org/" target="_blank" rel="noreferrer">{t(locale, "footer.officialSite")}</a>
        </div>
        <div className="footer-column footer-contact">
          <h2>{t(locale, "footer.contact")}</h2>
          <a href="mailto:info@donboscocairo.org">info@donboscocairo.org</a>
          <a href="tel:+20224576794">+20 2 2457 6794</a>
          <span>{t(locale, "footer.location")}</span>
        </div>
      </div>
      <div className="page-container footer-bottom">
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} {t(locale, "site.name")}. {t(locale, "footer.copyright")}</span>
          <span className="footer-credit">{t(locale, "footer.developed")} <a href="https://web-3-velix-ai.vercel.app/" target="_blank" rel="noreferrer">VELIX AI</a></span>
        </div>
        <p className="footer-developers">{t(locale, "footer.developers")}</p>
      </div>
    </footer>
  );
}

export function PublicSiteLayout({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <div className="site-frame">
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
