import { matches } from "../data/matches";
import { ongoingTournaments } from "../data/tournaments";
import { buildAbsoluteUrl, getLaunchedTournamentRecords } from "../lib/site";
import {
  createLaunchedTournamentSlug,
  normalizeSavedTournament,
} from "../components/launchedTournamentUtils";

export default async function sitemap() {
  const launchedTournaments = await getLaunchedTournamentRecords();
  const now = new Date();

  const staticRoutes = [
    {
      url: buildAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const tournamentRoutes = ongoingTournaments.map((tournament) => ({
    url: buildAbsoluteUrl(`/tournament/${tournament.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const launchedRoutes = launchedTournaments.map((tournament) => ({
    url: buildAbsoluteUrl(`/tournament/${createLaunchedTournamentSlug(tournament.id)}`),
    lastModified: tournament.updatedAt || tournament.savedAt || tournament.createdAt || now,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  const launchedMatchRoutes = launchedTournaments.flatMap((tournament) => {
    const normalizedTournament = normalizeSavedTournament(tournament);

    return normalizedTournament.fixtures
      .filter((fixture) => fixture.matchSlug)
      .map((fixture) => ({
        url: buildAbsoluteUrl(`/match/${fixture.matchSlug}`),
        lastModified: tournament.updatedAt || tournament.savedAt || tournament.createdAt || now,
        changeFrequency: "hourly",
        priority: 0.8,
      }));
  });

  const matchRoutes = matches.map((match) => ({
    url: buildAbsoluteUrl(`/match/${match.slug}`),
    lastModified: match.date || now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...tournamentRoutes,
    ...launchedRoutes,
    ...launchedMatchRoutes,
    ...matchRoutes,
  ];
}
