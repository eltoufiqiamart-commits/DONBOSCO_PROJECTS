import type { Metadata } from "next";
import { t } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/locales";
import { getPublicTeams } from "@/lib/data";
import { EmptyState, Eyebrow, TeamCard } from "@/components/content-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { title: t(locale, "teams.title"), description: t(locale, "teams.description") };
}

export default async function TeamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const teams = await getPublicTeams(48);
  return (
    <div className="page-shell">
      <section className="page-intro page-container">
        <Eyebrow>{t(raw, "home.teamsEyebrow")}</Eyebrow>
        <h1>{t(raw, "teams.title")}</h1>
        <p>{t(raw, "teams.description")}</p>
      </section>
      <section className="section-block page-container">
        {teams.length ? <div className="team-grid">{teams.map((team) => <TeamCard key={team.id} team={team} locale={raw} />)}</div> : <EmptyState title={t(raw, "teams.emptyTitle")} description={t(raw, "teams.emptyDescription")} />}
      </section>
    </div>
  );
}
