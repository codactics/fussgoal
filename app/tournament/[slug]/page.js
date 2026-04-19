import { notFound } from "next/navigation";
import TournamentPageClient from "./TournamentPageClient";
import { getTournamentBySlug } from "../../../data/tournaments";
import { getMatchesByTournamentSlug } from "../../../data/matches";
import { buildAbsoluteUrl, getNormalizedLaunchedTournamentBySlug } from "../../../lib/site";

function buildTournamentMetadata(tournament, slug) {
  const description =
    String(tournament?.description || "").trim() ||
    `Follow fixtures, standings, and live updates for ${tournament.name}.`;

  return {
    title: tournament.name,
    description,
    alternates: {
      canonical: `/tournament/${slug}`,
    },
    openGraph: {
      title: tournament.name,
      description,
      url: buildAbsoluteUrl(`/tournament/${slug}`),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: tournament.name,
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
