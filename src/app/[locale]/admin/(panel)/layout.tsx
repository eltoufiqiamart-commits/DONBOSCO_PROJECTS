import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminMessage, AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default async function AdminPanelLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/en/admin");
  if (!getSupabasePublicEnv()) {
    return <div className="admin-blocked-page"><AdminMessage title={t(raw, "admin.dashboard")} description={t(raw, "admin.notConfigured")} /></div>;
  }
  const supabase = await createServerSupabase();
  if (!supabase) redirect(`/${raw}/admin`);
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect(`/${raw}/admin`);
  const { data: isAdmin, error } = await supabase.rpc("is_project_admin");
  if (error || isAdmin !== true) {
    return <div className="admin-blocked-page"><AdminMessage title={t(raw, "admin.unauthorized")} description={t(raw, "admin.description")} kind="error" /></div>;
  }
  return <AdminShell locale={raw}>{children}</AdminShell>;
}
