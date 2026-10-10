"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, BookOpen, Building2, FileText, FolderKanban, LayoutDashboard, LogOut, Mail, Menu, Settings2, Users, X } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const links = [
  { href: "overview", key: "admin.overview", icon: LayoutDashboard },
  { href: "projects", key: "admin.projects", icon: FolderKanban },
  { href: "teams", key: "admin.teams", icon: Users },
  { href: "departments", key: "admin.departments", icon: Building2 },
  { href: "content", key: "admin.content", icon: BookOpen },
  { href: "inquiries", key: "admin.inquiries", icon: Mail },
  { href: "settings", key: "admin.settings", icon: Settings2 },
] as const;

export function AdminShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    router.replace(`/${locale}/admin`);
    router.refresh();
  }

  return (
    <div className="admin-shell">
      {menuOpen && <button className="admin-nav-backdrop" aria-label={t(locale, "common.close")} onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`} id="admin-navigation">
        <div className="admin-brand-row">
          <Link href={`/${locale}/admin/overview`} className="admin-brand">
            <span className="admin-brand-monogram">DB</span>
            <span><strong>{t(locale, "admin.dashboard")}</strong><small>{t(locale, "site.name")}</small></span>
          </Link>
          <button className="icon-button admin-sidebar-close" type="button" aria-label={t(locale, "common.close")} onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <p className="admin-nav-label">{t(locale, "admin.dashboard")}</p>
        <nav className="admin-nav" aria-label={t(locale, "admin.mobileNav")}>
          {links.map(({ href, key, icon: Icon }) => {
            const target = `/${locale}/admin/${href}`;
            const active = pathname === target || (href === "projects" && pathname.includes("/admin/projects/"));
            return <Link key={href} href={target} aria-current={active ? "page" : undefined} className={`admin-nav-link${active ? " is-active" : ""}`} onClick={() => setMenuOpen(false)}><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span>{t(locale, key)}</span></Link>;
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-language-block"><span className="admin-nav-label">{t(locale, "language.label")}</span><LanguageSwitcher locale={locale} compact /></div>
          <button type="button" className="admin-signout" onClick={signOut} disabled={signingOut}><LogOut size={17} aria-hidden="true" /><span>{t(locale, "admin.logout")}</span></button>
          <Link className="admin-public-link" href={`/${locale}`}><Activity size={15} aria-hidden="true" />{t(locale, "nav.home")}</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-mobile-menu" aria-label={t(locale, "nav.openMenu")} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="admin-topbar-title"><span className="eyebrow">{t(locale, "admin.dashboard")}</span><span className="admin-topbar-institute">{t(locale, "footer.institute")}</span></div>
          <div className="admin-topbar-actions"><LanguageSwitcher locale={locale} compact /><span className="admin-access-pill">{t(locale, "nav.admin")}</span></div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

export function AdminMessage({ title, description, kind = "warning" }: { title: string; description: string; kind?: "warning" | "error" }) {
  return <div className={`admin-message admin-message--${kind}`} role="status"><FileText size={20} aria-hidden="true" /><div><h1>{title}</h1><p>{description}</p></div></div>;
}
