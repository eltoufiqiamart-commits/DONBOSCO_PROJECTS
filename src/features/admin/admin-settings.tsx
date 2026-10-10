"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AdminSettings({ locale }: { locale: Locale }) {
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPasswordMode(true);
    });
    if (window.location.hash.includes("type=recovery")) setPasswordMode(true);
    return () => listener.subscription.unsubscribe();
  }, []);

  async function sendPasswordReset() {
    setPending("password"); setNotice(""); setError("");
    try {
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("unconfigured");
      const { data } = await supabase.auth.getUser();
      if (!data.user?.email) throw new Error("no_email");
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}/admin/settings`)}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.user.email, { redirectTo });
      if (resetError) throw new Error("reset_failed");
      setNotice(t(locale, "admin.passwordResetSent"));
    } catch { setError(t(locale, "admin.signInError")); }
    finally { setPending(""); }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); setError("");
    if (newPassword.length < 12) { setError(t(locale, "admin.passwordTooShort")); return; }
    if (newPassword !== confirmPassword) { setError(t(locale, "admin.passwordMismatch")); return; }
    setPending("password-update");
    try {
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("unconfigured");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error("update_failed");
      setNewPassword(""); setConfirmPassword(""); setPasswordMode(false); setNotice(t(locale, "admin.passwordUpdated"));
      window.history.replaceState(null, "", window.location.pathname);
    } catch { setError(t(locale, "admin.signInError")); }
    finally { setPending(""); }
  }

  async function cleanup() {
    setPending("cleanup"); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/media/cleanup", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error("cleanup_failed");
      const message = t(locale, "admin.cleanupResult").replace("{removed}", String(result.removed ?? 0)).replace("{retained}", String(result.retained ?? 0));
      setNotice(message || t(locale, "admin.cleanupResultShort"));
    } catch { setError(t(locale, "admin.errorLoading")); }
    finally { setPending(""); }
  }

  return (
    <div className="admin-settings-grid">
      {passwordMode && <form className="admin-panel-card admin-password-form" onSubmit={(event) => void updatePassword(event)}><div className="settings-card-icon"><KeyRound size={20} aria-hidden="true" /></div><p className="eyebrow">{t(locale, "admin.settingsTitle")}</p><h2>{t(locale, "admin.resetPasswordTitle")}</h2><label className="form-field"><span>{t(locale, "admin.newPassword")}</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /></label><label className="form-field"><span>{t(locale, "admin.confirmNewPassword")}</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} required /></label><button type="submit" className="button button-red" disabled={pending === "password-update"}>{pending === "password-update" ? t(locale, "common.saving") : t(locale, "admin.updatePassword")}</button></form>}
      <section className="admin-panel-card settings-card">
        <div className="settings-card-icon"><ShieldCheck size={21} aria-hidden="true" /></div>
        <p className="eyebrow">{t(locale, "admin.settingsTitle")}</p>
        <h2>{t(locale, "admin.settingsTitle")}</h2>
        <p>{t(locale, "admin.settingsIntro")}</p>
        <button type="button" className="button button-outline-dark" disabled={pending === "password"} onClick={() => void sendPasswordReset()}><KeyRound size={16} />{pending === "password" ? t(locale, "common.loading") : t(locale, "admin.changePassword")}</button>
      </section>
      <section className="admin-panel-card settings-card">
        <div className="settings-card-icon settings-card-icon--gold"><Trash2 size={20} aria-hidden="true" /></div>
        <p className="eyebrow">{t(locale, "admin.mediaHint")}</p>
        <h2>{t(locale, "admin.cleanupUploads")}</h2>
        <p>{t(locale, "admin.documentHint")}</p>
        <button type="button" className="button button-outline-dark" disabled={pending === "cleanup"} onClick={() => void cleanup()}><Trash2 size={16} />{pending === "cleanup" ? t(locale, "common.loading") : t(locale, "admin.cleanupUploads")}</button>
      </section>
      {notice && <p className="form-success-text settings-notice" role="status">{notice}</p>}{error && <p className="form-error settings-notice" role="alert">{error}</p>}
    </div>
  );
}
