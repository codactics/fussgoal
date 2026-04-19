import { getDb } from "./mongodb";
import {
  normalizeSavedTournament,
  parseLaunchedMatchSlug,
} from "../components/launchedTournamentUtils";

const DEFAULT_SITE_URL = "https://fussgoal.vercel.app";

export function getSiteUrl() {
  const configuredUrl = String(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).trim();

  return configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
}

export async function getLaunchedTournamentRecords() {
  try {
    const db = await getDb();
    const tournaments = await db
      .collection("tournaments")
      .find({ launched: true })
      .sort({ savedAt: -1, updatedAt: -1, createdAt: -1 })
      .toArray();

    return tournaments.map(({ _id, ...tournament }) => tournament);
  } catch {
    return [];
  }
}

export async function getNormalizedLaunchedTournaments() {
  const tournaments = await getLaunchedTournamentRecords();

  return tournaments.map(normalizeSavedTournament);
}

export async function getNormalizedLaunchedTournamentBySlug(slug) {
  const tournaments = await getNormalizedLaunchedTournaments();

  return tournaments.find((tournament) => tournament.slug === slug) || null;
}

export async function getNormalizedLaunchedMatchBySlug(slug) {
  const parsedSlug = parseLaunchedMatchSlug(slug);

  if (!parsedSlug) {
    return null;
  }

  const tournaments = await getNormalizedLaunchedTournaments();
  const tournament =
    tournaments.find((entry) => String(entry.id) === parsedSlug.tournamentId) || null;

  if (!tournament) {
    return null;
  }

  const fixture =
    tournament.fixtures.find(
      (entry) =>
        entry.fixtureKey === parsedSlug.fixtureKey || entry.matchSlug === String(slug || "").trim()
    ) || null;

  if (!fixture) {
    return null;
  }

  return {
    tournament,
    fixture,
  };
}

export function buildAbsoluteUrl(pathname) {
  return `${getSiteUrl()}${pathname}`;
}
