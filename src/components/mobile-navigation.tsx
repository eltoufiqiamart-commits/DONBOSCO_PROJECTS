"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => setMounted(true), []);

  // Navigating to another route always closes the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", open);
    document.documentElement.classList.toggle("mobile-nav-open", open);
    return () => {
      document.body.classList.remove("mobile-nav-open");
      document.documentElement.classList.remove("mobile-nav-open");
    };
  }, [open]);

  // Move focus into the drawer on open and restore it to the trigger on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      // The panel is `visibility: hidden` until the open class is painted, and an
      // element that is not visible yet cannot take focus. Wait two frames so the
      // drawer is on screen before moving focus into it.
      let inner = 0;
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  /*
   * The drawer is rendered into document.body rather than inside the header.
   * `.site-header` uses `backdrop-filter`, which makes it the containing block for
   * `position: fixed` descendants: keeping the drawer inside the header collapsed it
   * to the header's height (~57px) instead of a full-height panel. Portalling it also
   * keeps the panel clear of the header's stacking context, so it can sit above page
   * content on every breakpoint and in both writing directions.
   */
  const drawer = (
    <>
      {open && <button type="button" className="mobile-nav-scrim" aria-label={t(locale, "common.close")} onClick={() => setOpen(false)} tabIndex={-1} />}
      <div
        id="mobile-navigation-panel"
        ref={panelRef}
        className={`mobile-navigation${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-hidden={!open}
        aria-label={t(locale, "site.name")}
        inert={!open}
      >
        <div className="mobile-navigation-head">
          <p className="eyebrow">{t(locale, "site.name")}</p>
          <button ref={closeRef} type="button" className="icon-button" aria-label={t(locale, "nav.closeMenu")} onClick={() => setOpen(false)}>
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

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="mobile-menu-toggle"
        aria-label={open ? t(locale, "nav.closeMenu") : t(locale, "nav.openMenu")}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
