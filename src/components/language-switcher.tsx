"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";

type Props = { locale: Locale; compact?: boolean };

function Flag({ locale }: { locale: Locale }) {
  if (locale === "en") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" className="flag-svg">
        <defs><clipPath id="uk-clip"><circle cx="20" cy="20" r="20" /></clipPath></defs>
        <g clipPath="url(#uk-clip)">
          <rect width="40" height="40" fill="#17305c" />
          <path d="M-4 0 40 28M44 0 0 28" stroke="#fff" strokeWidth="8" />
          <path d="M-4 0 40 28M44 0 0 28" stroke="#bd2437" strokeWidth="3.2" />
          <path d="M20 0v40M0 20h40" stroke="#fff" strokeWidth="12" />
          <path d="M20 0v40M0 20h40" stroke="#bd2437" strokeWidth="5.5" />
        </g>
      </svg>
    );
  }
  if (locale === "ar") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" className="flag-svg">
        <defs><clipPath id="eg-clip"><circle cx="20" cy="20" r="20" /></clipPath></defs>
        <g clipPath="url(#eg-clip)">
          <rect width="40" height="13.34" fill="#ce1126" />
          <rect y="13.33" width="40" height="13.34" fill="#fff" />
          <rect y="26.66" width="40" height="13.34" fill="#111" />
          <path d="M19 18h2v5h-2zM18 23h4v1h-4z" fill="#c09340" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="flag-svg">
      <defs><clipPath id="it-clip"><circle cx="20" cy="20" r="20" /></clipPath></defs>
      <g clipPath="url(#it-clip)">
        <rect width="13.34" height="40" fill="#009246" />
        <rect x="13.33" width="13.34" height="40" fill="#fff" />
        <rect x="26.66" width="13.34" height="40" fill="#ce2b37" />
      </g>
    </svg>
  );
}

const localeLabels: Record<Locale, (locale: Locale) => string> = {
  en: (locale) => t(locale, "language.english"),
  ar: (locale) => t(locale, "language.arabic"),
  it: (locale) => t(locale, "language.italian"),
};

export function LanguageSwitcher({ locale, compact = false }: Props) {
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLanguage(next: Locale) {
    if (next === locale) return;
    document.cookie = `preferred-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    const translatedPath = pathname.replace(/^\/(en|ar|it)(?=\/|$)/, `/${next}`);
    startTransition(() => router.push(translatedPath));
  }

  return (
    <div
      className={`language-switcher${compact ? " language-switcher--compact" : ""}`}
      role="group"
      aria-label={t(locale, "language.label")}
      aria-busy={isPending}
    >
      {(["en", "ar", "it"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`language-choice${locale === option ? " is-active" : ""}`}
          aria-label={localeLabels[option](locale)}
          aria-pressed={locale === option}
          title={localeLabels[option](locale)}
          onClick={() => changeLanguage(option)}
        >
          <Flag locale={option} />
          {!compact && <span>{option.toUpperCase()}</span>}
        </button>
      ))}
    </div>
  );
}
