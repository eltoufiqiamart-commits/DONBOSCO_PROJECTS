import type { Metadata } from "next";
import { headers } from "next/headers";
import { directionFor, isLocale, type Locale, defaultLocale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/dictionaries";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const localeValue = requestHeaders.get("x-site-locale") ?? defaultLocale;
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;
  const dictionary = getDictionary(locale);
  return {
    title: {
      default: `${dictionary["site.name"]} · ${dictionary["footer.institute"]}`,
      template: `%s · ${dictionary["site.name"]}`,
    },
    description: dictionary["site.descriptor"],
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
    openGraph: {
      type: "website",
      siteName: dictionary["site.name"],
      title: dictionary["site.name"],
      description: dictionary["site.descriptor"],
      ...(process.env.NEXT_PUBLIC_SITE_URL ? { images: ["/images/don-bosco-campus.webp"] } : {}),
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const localeValue = requestHeaders.get("x-site-locale") ?? defaultLocale;
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;
  return (
    <html lang={locale} dir={directionFor(locale)} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
