import { notFound } from "next/navigation";
import TournamentPageClient from "./TournamentPageClient";
import { getTournamentBySlug } from "../../../data/tournaments";
import { getMatchesByTournamentSlug } from "../../../data/matches";
import { buildAbsoluteUrl, getNormalizedLaunchedTournamentBySlug } from "../../../lib/site";

function buildTournamentMetadata(tournament, slug) {
  const tournamentName = String(tournament?.name || "Football Tournament").trim();
  const customDescription = String(tournament?.description || "").trim();
  const description = customDescription
    ? `${tournamentName} tournament on FussGoal. ${customDescription} Follow fixtures, standings, live scores, and results.`
    : `${tournamentName} tournament page on FussGoal with fixtures, live scores, standings, match schedule, and results.`;

  return {
    title: `${tournamentName} Tournament Fixtures, Standings and Live Scores`,
    description,
    alternates: {
      canonical: `/tournament/${slug}`,
    },
    openGraph: {
      title: `${tournamentName} Tournament Fixtures, Standings and Live Scores`,
      description,
      url: buildAbsoluteUrl(`/tournament/${slug}`),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tournamentName} Tournament Fixtures, Standings and Live Scores`,
      description,
    },
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tournament = slug.startsWith("launched-")
    ? await getNormalizedLaunchedTournamentBySlug(slug)
    : getTournamentBySlug(slug);

  if (!tournament) {
    return {
      title: "Tournament not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildTournamentMetadata(tournament, slug);
}

export default async function TournamentPage({ params }) {
  const { slug } = await params;
  const staticTournament = getTournamentBySlug(slug);
  const staticMatches = getMatchesByTournamentSlug(slug);
  const initialLaunchedTournament = slug.startsWith("launched-")
    ? await getNormalizedLaunchedTournamentBySlug(slug)
    : null;

  if (!staticTournament && !initialLaunchedTournament && !slug.startsWith("launched-")) {
    notFound();
  }

  return (
    <TournamentPageClient
      slug={slug}
      staticTournament={staticTournament}
      staticMatches={staticMatches}
      initialLaunchedTournament={initialLaunchedTournament}
    />
  );
}
