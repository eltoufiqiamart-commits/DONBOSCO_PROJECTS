import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/features/admin/admin-login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrator sign in", robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const configured = Boolean(getSupabasePublicEnv());
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: allowed } = await supabase.rpc("is_project_admin");
      if (allowed === true) redirect(`/${raw}/admin/overview`);
    }
  }
  return (
    <main className="admin-login-page">
      <div className="admin-login-art" aria-hidden="true"><div className="login-art-mark">DB<span>PROJECTS</span></div><p>1926—2026</p></div>
      <section className="admin-login-card">
        <Image src="/images/don-bosco-cairo-centenary.jpeg" alt="Don Bosco Cairo centenary emblem" width={92} height={70} priority />
        <p className="eyebrow">{t(raw, "site.name")}</p>
        <h1>{t(raw, "admin.title")}</h1>
        <p className="admin-login-description">{t(raw, "admin.description")}</p>
        {!configured && <div className="config-notice" role="status">{t(raw, "admin.notConfigured")}</div>}
        <AdminLoginForm locale={raw} configured={configured} />
        <p className="admin-login-footnote">{t(raw, "admin.unauthorized")}</p>
      </section>
    </main>
  );
}
