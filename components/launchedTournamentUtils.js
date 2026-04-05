export function createLaunchedTournamentSlug(tournamentId) {
  return `launched-${tournamentId}`;
}

export function getStoredImageUrl(imageValue) {
  if (!imageValue) {
    return "";
  }

  if (typeof imageValue === "string") {
    return imageValue;
  }

  return imageValue.url || imageValue.dataUrl || "";
}

export function getTournamentDisplayStatus(startDate, endDate) {
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

  if (end && end < currentDate) {
    return "Past";
  }

  if (start && start > currentDate) {
    return "Upcoming";
  }

  return "Ongoing";
}

function normalizeFixture(homeTeam, awayTeam, roundLabel, startDate, index, teamLogoMap) {
  return {
    id: `${roundLabel}-${index + 1}-${homeTeam}-${awayTeam}`,
    homeTeam,
    awayTeam,
    homeLogo: teamLogoMap[homeTeam] || "",
    awayLogo: teamLogoMap[awayTeam] || "",
    status: roundLabel,
    date: startDate || "TBD",
    time: "TBD",
  };
}

function normalizeGroupFixtures(fixtures, startDate, teamLogoMap) {
  if (!fixtures) {
    return [];
  }

  if (fixtures.scope === "same" && Array.isArray(fixtures.groups)) {
    return fixtures.groups.flatMap((group) =>
      group.rounds.flatMap((matches, roundIndex) =>
        matches.map((match, index) =>
          normalizeFixture(
            match.home,
            match.away,
            `Group ${group.group} Round ${roundIndex + 1}`,
            startDate,
            index,
            teamLogoMap
          )
        )
      )
    );
  }

  if (fixtures.scope === "cross" && Array.isArray(fixtures.pairs)) {
    return fixtures.pairs.flatMap((pair) =>
      pair.matches.map((match, index) =>
        normalizeFixture(match.home, match.away, pair.label, startDate, index, teamLogoMap)
      )
    );
  }

  if (fixtures.scope === "league" && Array.isArray(fixtures.rounds)) {
    return fixtures.rounds.flatMap((matches, roundIndex) =>
      matches.map((match, index) =>
        normalizeFixture(
          match.home,
          match.away,
          `Round ${roundIndex + 1}`,
          startDate,
          index,
          teamLogoMap
        )
      )
    );
  }

  return [];
}

function normalizeGroups(groups, teamLogoMap) {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.map((group, index) => ({
    name: `Group ${String.fromCharCode(65 + index)}`,
    teams: Array.isArray(group)
      ? group.map((team) => ({
          name: team,
          logo: teamLogoMap[team] || "",
        }))
      : [],
  }));
}

export function normalizeSavedTournament(record) {
  const payload = record?.data || {};
  const settings = payload.settings || {};
  const startDate = settings.startDate || record.startDate || "";
  const endDate = settings.endDate || record.endDate || "";
  const fixtures = payload.fixtures || payload.leagueFixtures || null;
  const teamLogoMap = (payload.teamData || []).reduce((accumulator, team) => {
    if (team?.name) {
      accumulator[team.name] = team.logo || "";
    }
    return accumulator;
  }, {});
  const normalizedFixtures = normalizeGroupFixtures(fixtures, startDate, teamLogoMap);
  const normalizedGroups =
    record.tournamentType === "group" ? normalizeGroups(payload.groups, teamLogoMap) : [];

  return {
    id: record.id,
    slug: createLaunchedTournamentSlug(record.id),
    name: record.name,
    status: getTournamentDisplayStatus(startDate, endDate),
    matches: normalizedFixtures.length,
    description:
      record.tournamentType === "league"
        ? "League tournament launched by the admin."
        : "Group tournament launched by the admin.",
    fixtures: normalizedFixtures,
    groups: normalizedGroups,
    pointsTables: [],
    startDate,
    endDate,
    tournamentType: record.tournamentType,
    tournamentLogo: payload.tournamentLogo || null,
  };
}
