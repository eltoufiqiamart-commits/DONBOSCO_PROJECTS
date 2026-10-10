"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";

const navigation = [
  ["nav.home", ""],
  ["nav.projects", "/projects"],
  ["nav.departments", "/departments"],
  ["nav.teams", "/teams"],
  ["nav.industry", "/industry"],
  ["nav.about", "/about"],
] as const;

export function MobileNavigation({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", open);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={open ? t(locale, "nav.closeMenu") : t(locale, "nav.openMenu")}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
      </button>
      {open && <button className="mobile-nav-scrim" aria-label={t(locale, "common.close")} onClick={() => setOpen(false)} />}
      <div id="mobile-navigation-panel" className={`mobile-navigation${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="mobile-navigation-head">
          <p className="eyebrow">{t(locale, "site.name")}</p>
          <button type="button" className="icon-button" aria-label={t(locale, "nav.closeMenu")} onClick={() => setOpen(false)}>
            <X size={21} />
          </button>
        </div>
        <nav aria-label={t(locale, "nav.openMenu")}>
          {navigation.map(([key, href]) => (
            <Link key={key} href={`/${locale}${href}`} onClick={() => setOpen(false)}>
              <span>{t(locale, key)}</span><ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className="mobile-navigation-language">
          <span className="eyebrow">{t(locale, "language.label")}</span>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </>
  );
}
