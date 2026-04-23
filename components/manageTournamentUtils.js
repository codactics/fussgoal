import { getStoredImageUrl } from "./launchedTournamentUtils";

export function getGroupLabel(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

export function buildTeamLogoMap(payload) {
  return (payload.teamData || []).reduce((accumulator, team) => {
    if (team?.name) {
      accumulator[team.name] = getStoredImageUrl(team.logo);
    }

    return accumulator;
  }, {});
}

export function getTournamentFixtureSections(tournament) {
  const payload = tournament?.data || {};
  const tournamentFixtures = payload.fixtures || payload.leagueFixtures || null;
  const knockoutMatches = Array.isArray(payload.knockoutMatches) ? payload.knockoutMatches : [];
  const fixtureSchedules = payload.fixtureSchedules || {};
  const sections = [];

  if (tournamentFixtures.scope === "same" && Array.isArray(tournamentFixtures.groups)) {
    sections.push(
      ...tournamentFixtures.groups.map((group) => ({
        title: `Group ${group.group}`,
        kind: "group",
        matches: group.rounds.flatMap((roundMatches, roundIndex) =>
          (roundMatches || []).map((match, matchIndex) => ({
            ...match,
            roundIndex,
            matchIndex,
          }))
        ),
      }))
    );
  }

  if (tournamentFixtures.scope === "cross" && Array.isArray(tournamentFixtures.pairs)) {
    sections.push(
      ...tournamentFixtures.pairs.map((pair) => ({
        title: pair.label,
        kind: "cross",
        matches: (pair.matches || []).map((match, matchIndex) => ({
          ...match,
          roundIndex: 0,
          matchIndex,
        })),
      }))
    );
  }

  if (tournamentFixtures.scope === "league" && Array.isArray(tournamentFixtures.rounds)) {
    sections.push(
      {
        title: "League",
        kind: "league",
        matches: tournamentFixtures.rounds.flatMap((roundMatches, roundIndex) =>
          (roundMatches || []).map((match, matchIndex) => ({
            ...match,
            roundIndex,
            matchIndex,
          }))
        ),
      }
    );
  }

  if (knockoutMatches.length) {
    sections.push(
      ...knockoutMatches.map((match, matchIndex) => ({
        title: String(match?.title || `Knockout Match ${matchIndex + 1}`),
        kind: "knockout",
        matches: [
          {
            home: String(match?.home || ""),
            away: String(match?.away || ""),
            includeInTable: Boolean(match?.includeInTable),
            roundIndex: 0,
            matchIndex,
          },
        ],
      }))
    );
  }

  return sections.map((section, sectionIndex) => ({
    ...section,
    matches: section.matches.map((match) => {
      const fixtureKey = getFixtureKey(sectionIndex, match.roundIndex, match.matchIndex);
      const scheduleRecord = fixtureSchedules[fixtureKey] || {};

      return {
        ...match,
        date: String(scheduleRecord.date || match.date || match.matchDate || ""),
        time: String(scheduleRecord.time || match.time || match.matchTime || ""),
      };
    }),
  }));
}

export function getFixtureKey(sectionIndex, roundIndex, matchIndex) {
  return `${sectionIndex}-${roundIndex}-${matchIndex}`;
}

export function getFixtureByIndexes(tournament, sectionIndex, roundIndex, matchIndex) {
  const sections = getTournamentFixtureSections(tournament);
  const section = sections[sectionIndex];

  if (!section) {
    return null;
  }

  return (
    section.matches.find(
      (match) => match.roundIndex === roundIndex && match.matchIndex === matchIndex
    ) || null
  );
}

function getMatchEventTeamName(event) {
  return String(event?.teamName || event?.subjectTeamName || "").trim();
}

export function getMatchStatusHasStarted(statusRecord) {
  const kickoffMoment = statusRecord?.systemMoments?.kickoff;

  return Boolean(
    Number.isFinite(kickoffMoment) ||
      statusRecord?.matchStatus === "running" ||
      statusRecord?.matchStatus === "paused" ||
      statusRecord?.matchStatus === "halftime" ||
      statusRecord?.matchStatus === "ended" ||
      (Array.isArray(statusRecord?.events) && statusRecord.events.length)
  );
}

export function getMatchScore(statusRecord) {
  if (
    Number.isFinite(statusRecord?.goalScore?.home) &&
    Number.isFinite(statusRecord?.goalScore?.away)
  ) {
    return {
      home: statusRecord.goalScore.home,
      away: statusRecord.goalScore.away,
    };
  }

  const score = { home: 0, away: 0 };
  const homeTeam = String(statusRecord?.homeTeam || "");
  const awayTeam = String(statusRecord?.awayTeam || "");

  (statusRecord?.events || []).forEach((event) => {
    if (event?.action !== "goal" && event?.action !== "penalty-goal") {
      return;
    }

    const teamName = getMatchEventTeamName(event);
    if (teamName === homeTeam) {
      score.home += 1;
    }
    if (teamName === awayTeam) {
      score.away += 1;
    }
  });

  return score;
}

export function getMatchClockSeconds(statusRecord, now = Date.now()) {
  const halfDurationMinutes = Number(statusRecord?.halfDurationMinutes) || 0;
  const halfDurationSeconds = Math.max(0, halfDurationMinutes * 60);
  const totalDurationSeconds = halfDurationSeconds * 2;

  if (statusRecord?.matchStatus === "ended") {
    return totalDurationSeconds;
  }

  const elapsedBeforePause = Number(statusRecord?.elapsedBeforePause) || 0;
  if (
    statusRecord?.matchStatus === "running" &&
    Number.isFinite(statusRecord?.runningStartedAt)
  ) {
    return Math.max(
      0,
      elapsedBeforePause + Math.floor((now - statusRecord.runningStartedAt) / 1000)
    );
  }

  if (Number.isFinite(statusRecord?.clockSeconds)) {
    return Math.max(0, statusRecord.clockSeconds);
  }

  return Math.max(0, elapsedBeforePause);
}

export function formatMatchClock(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getFixtureStatusLabel(statusRecord) {
  if (statusRecord?.matchStatus === "running") {
    return "Live";
  }
  if (statusRecord?.matchStatus === "paused") {
    return "Live";
  }
  if (statusRecord?.matchStatus === "halftime") {
    return "HT";
  }
  if (statusRecord?.matchStatus === "ended") {
    return "End";
  }
  return "";
}

export function getFixturePhaseLabel(statusRecord) {
  if (statusRecord?.matchStatus === "halftime") {
    return "HT";
  }

  if (statusRecord?.matchStatus === "running") {
    return statusRecord?.selectedHalf === "second" ? "2nd Half" : "1st Half";
  }

  if (statusRecord?.matchStatus === "paused") {
    return statusRecord?.selectedHalf === "second" ? "2nd Half Paused" : "1st Half Paused";
  }

  if (statusRecord?.matchStatus === "ended") {
    return "Full Time";
  }

  return "";
}

export function buildTournamentTables(tournament) {
  const payload = tournament?.data || {};
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const fixtureSections = getTournamentFixtureSections(tournament);
  const matchStatuses = payload.matchStatuses || {};
  const teamLogoMap = buildTeamLogoMap(payload);

  return groups.map((groupTeams, groupIndex) => {
    const teamStats = new Map(
      groupTeams.map((teamName) => [
        teamName,
        {
          team: teamName,
          logo: teamLogoMap[teamName] || "",
          points: 0,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          scored: 0,
          contained: 0,
          difference: 0,
          yellow: 0,
          red: 0,
          penalty: 0,
        },
      ])
    );
    const groupSet = new Set(groupTeams);

    fixtureSections.forEach((section, sectionIndex) => {
      section.matches.forEach((match) => {
        if (section.kind === "knockout" && !match.includeInTable) {
          return;
        }

        const homeInGroup = groupSet.has(match.home);
        const awayInGroup = groupSet.has(match.away);

        if (!homeInGroup && !awayInGroup) {
          return;
        }

        const fixtureKey = getFixtureKey(sectionIndex, match.roundIndex, match.matchIndex);
        const statusRecord = matchStatuses[fixtureKey];
        if (!getMatchStatusHasStarted(statusRecord)) {
          return;
        }

        const homeStats = teamStats.get(match.home);
        const awayStats = teamStats.get(match.away);
        if (!homeStats && !awayStats) {
          return;
        }

        const score = getMatchScore(statusRecord);
        if (homeStats) {
          homeStats.played += 1;
          homeStats.scored += score.home;
          homeStats.contained += score.away;
        }

        if (awayStats) {
          awayStats.played += 1;
          awayStats.scored += score.away;
          awayStats.contained += score.home;
        }

        if (score.home > score.away) {
          if (homeStats) {
            homeStats.wins += 1;
            homeStats.points += 3;
          }
          if (awayStats) {
            awayStats.losses += 1;
          }
        } else if (score.home < score.away) {
          if (awayStats) {
            awayStats.wins += 1;
            awayStats.points += 3;
          }
          if (homeStats) {
            homeStats.losses += 1;
          }
        } else {
          if (homeStats) {
            homeStats.draws += 1;
            homeStats.points += 1;
          }
          if (awayStats) {
            awayStats.draws += 1;
            awayStats.points += 1;
          }
        }

        const subjectYellowCounts = new Map();
        (statusRecord?.events || []).forEach((event) => {
          const teamName = getMatchEventTeamName(event);
          const teamRecord = teamStats.get(teamName);
          if (!teamRecord) {
            return;
          }

          if (event.action === "yellow") {
            teamRecord.yellow += 1;
            const subjectKey = `${teamName}::${event.subjectKey || event.subjectLabel || event.id || ""}`;
            const nextYellowCount = (subjectYellowCounts.get(subjectKey) || 0) + 1;
            subjectYellowCounts.set(subjectKey, nextYellowCount);
            if (nextYellowCount === 2) {
              teamRecord.red += 1;
            }
          }

          if (event.action === "red") {
            teamRecord.red += 1;
          }

          if (
            event.action === "penalty" ||
            event.action === "penalty-goal" ||
            event.action === "penalty-missed"
          ) {
            teamRecord.penalty += 1;
          }
        });
      });
    });

    const rows = Array.from(teamStats.values())
      .map((team) => ({
        ...team,
        difference: team.scored - team.contained,
      }))
      .sort((left, right) => {
        if (right.points !== left.points) {
          return right.points - left.points;
        }
        if (right.difference !== left.difference) {
          return right.difference - left.difference;
        }
        if (right.scored !== left.scored) {
          return right.scored - left.scored;
        }
        return left.team.localeCompare(right.team);
      });

    return {
      title: getGroupLabel(groupIndex),
      rows,
    };
  });
}

function getSummarySubjectLabel(event, fallbackTeamName = "") {
  const subjectLabel = String(event?.subjectLabel || "").trim();
  const teamName = String(event?.teamName || event?.subjectTeamName || fallbackTeamName || "").trim();

  if (subjectLabel && teamName && subjectLabel !== teamName) {
    return {
      label: subjectLabel,
      team: teamName,
    };
  }

  return {
    label: subjectLabel || teamName || "Unknown",
    team: teamName,
  };
}

function incrementSummaryStat(map, key, data) {
  if (!key) {
    return;
  }

  const current = map.get(key) || {
    label: data.label,
    team: data.team,
    value: 0,
  };

  current.value += 1;
  map.set(key, current);
}

function sortSummaryRows(map) {
  return Array.from(map.values()).sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    const leftLabel = `${left.label} ${left.team}`.trim();
    const rightLabel = `${right.label} ${right.team}`.trim();

    return leftLabel.localeCompare(rightLabel);
  });
}

export function buildTournamentSummaryTables(tournament) {
  const payload = tournament?.data || {};
  const fixtureSections = getTournamentFixtureSections(tournament);
  const matchStatuses = payload.matchStatuses || {};
  const scorers = new Map();
  const assists = new Map();
  const yellowCards = new Map();
  const redCards = new Map();
  const cleanSheets = new Map();

  fixtureSections.forEach((section, sectionIndex) => {
    section.matches.forEach((match) => {
      const fixtureKey = getFixtureKey(sectionIndex, match.roundIndex, match.matchIndex);
      const statusRecord = matchStatuses[fixtureKey];

      if (!getMatchStatusHasStarted(statusRecord)) {
        return;
      }

      const score = getMatchScore(statusRecord);
      if (String(match.home || "").trim() && score.away === 0) {
        incrementSummaryStat(cleanSheets, match.home, {
          label: match.home,
          team: "",
        });
      }
      if (String(match.away || "").trim() && score.home === 0) {
        incrementSummaryStat(cleanSheets, match.away, {
          label: match.away,
          team: "",
        });
      }

      (statusRecord?.events || []).forEach((event) => {
        const subject = getSummarySubjectLabel(event, getMatchEventTeamName(event));
        const subjectKey = `${subject.team}::${subject.label}`;

        if (event.action === "goal" || event.action === "penalty-goal") {
          incrementSummaryStat(scorers, subjectKey, subject);
        }

        if (event.action === "assist") {
          incrementSummaryStat(assists, subjectKey, subject);
        }

        if (event.action === "yellow") {
          incrementSummaryStat(yellowCards, subjectKey, subject);
        }

        if (event.action === "red") {
          incrementSummaryStat(redCards, subjectKey, subject);
        }
      });
    });
  });

  return [
    { key: "topScorer", title: "Top Scorer", valueLabel: "Goals", rows: sortSummaryRows(scorers) },
    { key: "cleanSheet", title: "Clean Sheet", valueLabel: "Clean Sheets", rows: sortSummaryRows(cleanSheets) },
    { key: "mostAssist", title: "Most Assist", valueLabel: "Assists", rows: sortSummaryRows(assists) },
    { key: "yellowCard", title: "Yellow Card", valueLabel: "Cards", rows: sortSummaryRows(yellowCards) },
    { key: "redCard", title: "Red Card", valueLabel: "Cards", rows: sortSummaryRows(redCards) },
  ];
}
