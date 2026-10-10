import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/locales";
import { PublicSiteLayout } from "@/components/site-chrome";

export default async function PublicLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PublicSiteLayout locale={locale as Locale}>{children}</PublicSiteLayout>;
}
