"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AdminLoginForm({ locale, configured }: { locale: Locale; configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");

  async function requestPasswordReset() {
    setError(""); setResetSent(false);
    if (!email.trim()) { setError(t(locale, "industry.requiredField")); return; }
    const supabase = createBrowserSupabase();
    if (!supabase) { setError(t(locale, "admin.notConfigured")); return; }
    setResetPending(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}/admin/settings`)}` });
      if (resetError) setError(t(locale, "admin.signInError"));
      else setResetSent(true);
    } catch { setError(t(locale, "admin.signInError")); }
    finally { setResetPending(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError(t(locale, "admin.notConfigured"));
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError(t(locale, "industry.requiredField"));
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError(t(locale, "admin.notConfigured"));
      return;
    }
    setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(t(locale, "admin.signInError"));
      setPending(false);
      return;
    }
    const { data: isAdmin, error: authorizationError } = await supabase.rpc("is_project_admin");
    if (authorizationError || isAdmin !== true) {
      await supabase.auth.signOut();
      setError(t(locale, "admin.unauthorized"));
      setPending(false);
      return;
    }
    router.replace(`/${locale}/admin/overview`);
    router.refresh();
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label className="form-field">
        <span>{t(locale, "admin.email")}</span>
        <span className="input-icon-wrap"><Mail size={17} aria-hidden="true" /><input name="email" type="email" autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); setResetSent(false); }} required maxLength={254} /></span>
      </label>
      <label className="form-field">
        <span>{t(locale, "admin.password")}</span>
        <span className="input-icon-wrap"><KeyRound size={17} aria-hidden="true" /><input name="password" type="password" autoComplete="current-password" required /></span>
      </label>
      <button type="button" className="password-reset-link" onClick={() => void requestPasswordReset()} disabled={!configured || resetPending}>{resetPending ? t(locale, "common.loading") : t(locale, "admin.forgotPassword")}</button>
      {resetSent && <p className="form-success-text" role="status">{t(locale, "admin.passwordResetSent")}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button button-red admin-login-submit" disabled={pending || !configured}>
        <LockKeyhole size={17} aria-hidden="true" />{pending ? t(locale, "admin.signingIn") : t(locale, "admin.signIn")}
      </button>
    </form>
  );
}
