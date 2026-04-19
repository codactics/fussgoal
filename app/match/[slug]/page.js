import MatchPageClient from "./MatchPageClient";
import { getMatchBySlug } from "../../../data/matches";
import {
  buildAbsoluteUrl,
  getNormalizedLaunchedMatchBySlug,
} from "../../../lib/site";

export const dynamic = "force-dynamic";

function buildStaticInitialMatch(match) {
  if (!match) {
    return null;
  }

  return {
    source: "static",
    slug: match.slug,
    tournamentName: match.tournament,
    sectionTitle: match.tournament,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeLogo: "",
    awayLogo: "",
    score: {
      home: match.homeScore,
      away: match.awayScore,
    },
    status: match.status,
    phaseLabel: "",
    clockText: match.minute || "",
    statusRecord: null,
    date: match.date || "TBD",
    time: "TBD",
    venue: match.venue || "",
    lineups: {
      home: [],
      away: [],
    },
    timelineEntries: match.events || [],
    telecast: null,
  };
}

function buildLaunchedInitialMatch(launchedMatch, slug) {
  if (!launchedMatch?.tournament || !launchedMatch?.fixture) {
    return null;
  }

  return {
    source: "launched",
    slug,
    tournamentId: launchedMatch.tournament.id,
    fixtureKey: launchedMatch.fixture.fixtureKey,
    tournamentName: launchedMatch.tournament.name,
    sectionTitle: launchedMatch.fixture.sectionTitle || launchedMatch.tournament.name,
    homeTeam: launchedMatch.fixture.homeTeam,
    awayTeam: launchedMatch.fixture.awayTeam,
    homeLogo: launchedMatch.fixture.homeLogo || "",
    awayLogo: launchedMatch.fixture.awayLogo || "",
    score: launchedMatch.fixture.score || { home: 0, away: 0 },
    status: launchedMatch.fixture.status,
    phaseLabel: launchedMatch.fixture.phaseLabel || "",
    clockText: launchedMatch.fixture.clockText || "",
    statusRecord: launchedMatch.fixture.statusRecord || null,
    date: launchedMatch.fixture.date || "TBD",
    time: launchedMatch.fixture.time || "TBD",
    venue: "",
    lineups: launchedMatch.fixture.lineup || { home: [], away: [] },
    timelineEntries: launchedMatch.fixture.timelineEntries || [],
    telecast: launchedMatch.fixture.telecast || null,
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const launchedMatch = await getNormalizedLaunchedMatchBySlug(slug);
  const fixture = launchedMatch?.fixture || null;
  const staticMatch = fixture ? null : getMatchBySlug(slug);
  const match = fixture || staticMatch;
  const imageUrl = buildAbsoluteUrl(`/match/${slug}/opengraph-image`);

  if (!match) {
    return {
      title: "Match not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const tournamentName =
    launchedMatch?.tournament?.name || staticMatch?.tournament || "Football Tournament";
  const title = `${match.homeTeam} vs ${match.awayTeam} | ${tournamentName} Live Score and Result`;
  const description = `Follow ${match.homeTeam} vs ${match.awayTeam} in the ${tournamentName} on ${
    match.date || "TBD"
  }${match.time ? ` at ${match.time}` : ""}. Get live score, match updates, lineups, timeline, and result on FussGoal.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/match/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: buildAbsoluteUrl(`/match/${slug}`),
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function MatchPage({ params }) {
  const { slug } = await params;
  const launchedMatch = await getNormalizedLaunchedMatchBySlug(slug);
  const initialMatch = launchedMatch
    ? buildLaunchedInitialMatch(launchedMatch, slug)
    : buildStaticInitialMatch(getMatchBySlug(slug));

  return <MatchPageClient initialMatch={initialMatch} />;
}
