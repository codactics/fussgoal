import { getStoredImageUrl } from "./launchedTournamentUtils";
import { getKnownTeam } from "./knownTeams";

export function getGroupLabel(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

export function buildTeamLogoMap(payload) {
  return (payload.teamData || []).reduce((accumulator, team) => {
    if (team?.name) {
      accumulator[team.name] = getKnownTeam(team.name)?.logo || getStoredImageUrl(team.logo) || "";
    }

    return accumulator;
  }, {});
}

export function getTournamentTeamGroups(tournament) {
  const payload = tournament?.data || {};
  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter((group) => Array.isArray(group) && group.length)
    : [];

  if (groups.length) {
    return groups;
  }

  if (tournament?.tournamentType !== "league") {
    return [];
  }

  const teamNames = Array.isArray(payload.teamData) && payload.teamData.length
    ? payload.teamData.map((team) => String(team?.name || "").trim())
    : Array.isArray(payload.teams)
      ? payload.teams.map((team) => String(team || "").trim())
      : [];
  const uniqueTeamNames = teamNames.filter(
    (teamName, index, teams) => teamName && teams.indexOf(teamName) === index
  );

  return uniqueTeamNames.length ? [uniqueTeamNames] : [];
}

export function getTournamentFixtureSections(tournament) {
  const payload = tournament?.data || {};
  const tournamentFixtures = payload.fixtures || payload.leagueFixtures || null;
  const knockoutMatches = Array.isArray(payload.knockoutMatches) ? payload.knockoutMatches : [];
  const fixtureSchedules = payload.fixtureSchedules || {};
  const matchStatuses = payload.matchStatuses || {};
  const teamGroups = getTournamentTeamGroups(tournament);
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
    const knockoutStartSectionIndex = sections.length;
    sections.push(
      ...knockoutMatches.map((match, matchIndex) => ({
        title: String(match?.title || `Knockout Match ${matchIndex + 1}`),
        kind: "knockout",
        matches: [
          {
            home: resolveKnockoutTeamSource({
              fallback: match?.home,
              groups: teamGroups,
              matchStatuses,
              knockoutMatches,
              knockoutStartSectionIndex,
              sections,
              source: match?.homeSource,
              tournament,
            }),
            away: resolveKnockoutTeamSource({
              fallback: match?.away,
              groups: teamGroups,
              matchStatuses,
              knockoutMatches,
              knockoutStartSectionIndex,
              sections,
              source: match?.awaySource,
              tournament,
            }),
            includeInTable: Boolean(match?.includeInTable),
            homeSource: match?.homeSource || null,
            awaySource: match?.awaySource || null,
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

function resolveKnockoutTeamSource({
  fallback,
  groups,
  matchStatuses,
  knockoutMatches,
  knockoutStartSectionIndex,
  sections,
  source,
  tournament,
}) {
  const fallbackValue = String(fallback || "").trim();

  if (source?.type === "groupPosition") {
    return (
      resolveGroupPositionTeam({
        fallback: source.team || fallbackValue,
        groups,
        matchStatuses,
        rowIndex: source.rowIndex,
        sectionList: sections,
        groupIndex: source.groupIndex,
        tournament,
      }) || fallbackValue
    );
  }

  if (source?.type !== "knockoutWinner") {
    return fallbackValue;
  }

  const sourceMatchIndex = Number.parseInt(source.matchIndex, 10);
  const sourceMatch = knockoutMatches[sourceMatchIndex];

  if (!sourceMatch || sourceMatchIndex < 0) {
    return fallbackValue;
  }

  const fixtureKey = getFixtureKey(knockoutStartSectionIndex + sourceMatchIndex, 0, sourceMatchIndex);
  const statusRecord = matchStatuses[fixtureKey];
  const winnerSide = getMatchWinnerSide(statusRecord);

  if (winnerSide === "home") {
    return String(statusRecord?.homeTeam || sourceMatch.home || "").trim() || fallbackValue;
  }

  if (winnerSide === "away") {
    return String(statusRecord?.awayTeam || sourceMatch.away || "").trim() || fallbackValue;
  }

  return fallbackValue || `Winner of ${sourceMatch.title || `Knockout Match ${sourceMatchIndex + 1}`}`;
}

function resolveGroupPositionTeam({
  fallback,
  groups,
  groupIndex,
  matchStatuses,
  rowIndex,
  sectionList,
  tournament,
}) {
  const groupTeams = Array.isArray(groups?.[groupIndex]) ? groups[groupIndex] : [];
  const positionIndex = Number.parseInt(rowIndex, 10);

  if (!groupTeams.length || !Number.isFinite(positionIndex) || positionIndex < 0) {
    return String(fallback || "").trim();
  }

  const groupSet = new Set(groupTeams);
  const teamStats = new Map(
    groupTeams.map((teamName) => [
      teamName,
      {
        team: teamName,
        groupOrder: groupTeams.indexOf(teamName),
        points: 0,
        scored: 0,
        contained: 0,
        difference: 0,
        conductScore: 0,
      },
    ])
  );
  const groupMatches = [];

  sectionList.forEach((section, sectionIndex) => {
    if (section.kind === "knockout") {
      return;
    }

    section.matches.forEach((match) => {
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

      const score = getMatchScore(statusRecord);
      const homeStats = teamStats.get(match.home);
      const awayStats = teamStats.get(match.away);

      if (homeStats) {
        homeStats.scored += score.home;
        homeStats.contained += score.away;
      }

      if (awayStats) {
        awayStats.scored += score.away;
        awayStats.contained += score.home;
      }

      groupMatches.push({
        away: match.away,
        awayScore: score.away,
        home: match.home,
        homeScore: score.home,
      });

      const winnerSide = getRegulationWinnerSide(statusRecord);
      if (winnerSide === "home") {
        if (homeStats) {
          homeStats.points += 3;
        }
      } else if (winnerSide === "away") {
        if (awayStats) {
          awayStats.points += 3;
        }
      } else {
        if (homeStats) {
          homeStats.points += 1;
        }
        if (awayStats) {
          awayStats.points += 1;
        }
      }

      if (homeStats) {
        homeStats.conductScore += getConductScore(statusRecord?.events, match.home);
      }
      if (awayStats) {
        awayStats.conductScore += getConductScore(statusRecord?.events, match.away);
      }
    });
  });

  const rows = rankGroupRows(
    Array.from(teamStats.values())
    .map((team) => ({
      ...team,
      difference: team.scored - team.contained,
    })),
    groupMatches
  );

  return rows[positionIndex]?.team || String(fallback || "").trim();
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

export function getPenaltyShootoutScore(statusRecord) {
  const score = { home: 0, away: 0 };
  const entries = Array.isArray(statusRecord?.penaltyShootout?.entries)
    ? statusRecord.penaltyShootout.entries
    : [];
  const homeTeam = String(statusRecord?.homeTeam || "");
  const awayTeam = String(statusRecord?.awayTeam || "");

  entries.forEach((entry) => {
    if (entry?.action !== "goal") {
      return;
    }

    const teamName = String(entry.teamName || "");
    if (teamName === homeTeam) {
      score.home += 1;
    }
    if (teamName === awayTeam) {
      score.away += 1;
    }
  });

  return score;
}

export function getPenaltyShootoutWinnerSide(statusRecord) {
  if (!statusRecord?.penaltyShootout?.finished) {
    return "";
  }

  const penaltyScore = getPenaltyShootoutScore(statusRecord);
  if (penaltyScore.home > penaltyScore.away) {
    return "home";
  }
  if (penaltyScore.away > penaltyScore.home) {
    return "away";
  }
  return "";
}

export function getMatchWinnerSide(statusRecord) {
  const score = getMatchScore(statusRecord);
  if (score.home > score.away) {
    return "home";
  }
  if (score.away > score.home) {
    return "away";
  }
  return getPenaltyShootoutWinnerSide(statusRecord);
}

function getRegulationWinnerSide(statusRecord) {
  const score = getMatchScore(statusRecord);
  if (score.home > score.away) {
    return "home";
  }
  if (score.away > score.home) {
    return "away";
  }
  return "";
}

export function getConductScore(events, teamName) {
  const subjects = new Map();

  (events || []).forEach((event) => {
    if (getMatchEventTeamName(event) !== teamName) {
      return;
    }

    const subjectKey = String(
      event?.subjectKey || event?.subjectLabel || event?.id || `team:${teamName}`
    );
    const record = subjects.get(subjectKey) || { directRed: false, secondYellowRed: false, yellow: 0 };

    if (event.action === "yellow") {
      record.yellow += 1;
    } else if (event.action === "second-yellow-red") {
      record.secondYellowRed = true;
    } else if (event.action === "red" || event.action === "direct-red") {
      record.directRed = true;
    } else if (event.action === "yellow-direct-red") {
      record.yellow = Math.max(record.yellow, 1);
      record.directRed = true;
    }

    subjects.set(subjectKey, record);
  });

  return Array.from(subjects.values()).reduce((score, record) => {
    if (record.directRed && record.yellow > 0) {
      return score - 5;
    }
    if (record.directRed) {
      return score - 4;
    }
    if (record.secondYellowRed || record.yellow >= 2) {
      return score - 3;
    }
    if (record.yellow === 1) {
      return score - 1;
    }
    return score;
  }, 0);
}

function getHeadToHeadStats(rows, matches) {
  const teams = new Set(rows.map((row) => row.team));
  const stats = new Map(
    rows.map((row) => [row.team, { team: row.team, points: 0, difference: 0, scored: 0 }])
  );

  matches.forEach((match) => {
    if (!teams.has(match.home) || !teams.has(match.away)) {
      return;
    }

    const home = stats.get(match.home);
    const away = stats.get(match.away);
    home.scored += match.homeScore;
    home.difference += match.homeScore - match.awayScore;
    away.scored += match.awayScore;
    away.difference += match.awayScore - match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += 3;
    } else if (match.awayScore > match.homeScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  return stats;
}

function splitByCriteria(rows, criteria) {
  const groups = [];

  rows.forEach((row) => {
    const previousGroup = groups[groups.length - 1];
    if (!previousGroup || criteria.some((field) => previousGroup[0][field] !== row[field])) {
      groups.push([row]);
    } else {
      previousGroup.push(row);
    }
  });

  return groups;
}

function rankHeadToHead(rows, matches, path = "h2h") {
  if (rows.length < 2) {
    return rows.map((row) => ({ ...row, headToHeadKey: `${path}:0` }));
  }

  const stats = getHeadToHeadStats(rows, matches);
  const ranked = rows
    .map((row) => ({
      ...row,
      headToHeadDifference: stats.get(row.team).difference,
      headToHeadPoints: stats.get(row.team).points,
      headToHeadScored: stats.get(row.team).scored,
    }))
    .sort(
      (left, right) =>
        right.headToHeadPoints - left.headToHeadPoints ||
        right.headToHeadDifference - left.headToHeadDifference ||
        right.headToHeadScored - left.headToHeadScored
    );
  const groups = splitByCriteria(ranked, [
    "headToHeadPoints",
    "headToHeadDifference",
    "headToHeadScored",
  ]);

  if (groups.length === 1) {
    return rows.map((row) => ({ ...row, headToHeadKey: `${path}:tied` }));
  }

  return groups.flatMap((group, groupIndex) => {
    const originalRows = group.map(
      ({ headToHeadDifference, headToHeadPoints, headToHeadScored, ...row }) => row
    );
    return originalRows.length === 1
      ? [{ ...originalRows[0], headToHeadKey: `${path}:${groupIndex}` }]
      : rankHeadToHead(originalRows, matches, `${path}:${groupIndex}`);
  });
}

function rankGroupRows(rows, matches) {
  const pointGroups = new Map();
  rows.forEach((row) => {
    const group = pointGroups.get(row.points) || [];
    group.push(row);
    pointGroups.set(row.points, group);
  });

  const ranked = Array.from(pointGroups.entries())
    .sort(([left], [right]) => right - left)
    .flatMap(([, tiedRows]) => {
      const headToHeadRanked = rankHeadToHead(tiedRows, matches);
      return splitByCriteria(headToHeadRanked, ["headToHeadKey"]).flatMap((headToHeadGroup) =>
        headToHeadGroup.sort((left, right) => {
          if (right.difference !== left.difference) {
            return right.difference - left.difference;
          }
          if (right.scored !== left.scored) {
            return right.scored - left.scored;
          }
          if (right.conductScore !== left.conductScore) {
            return right.conductScore - left.conductScore;
          }
          return left.groupOrder - right.groupOrder;
        })
      );
    });

  const rowsWithTieState = ranked.map((row, index) => {
    const isUnresolvedAgainst = (other) =>
      other &&
      row.points === other.points &&
      row.headToHeadKey === other.headToHeadKey &&
      row.difference === other.difference &&
      row.scored === other.scored &&
      row.conductScore === other.conductScore;
    const tiedWithPrevious = isUnresolvedAgainst(ranked[index - 1]);
    const tiedWithNext = isUnresolvedAgainst(ranked[index + 1]);

    return { ...row, unresolvedTie: tiedWithPrevious || tiedWithNext };
  });

  return rowsWithTieState.map((row, index) => {
    if (!row.unresolvedTie) {
      return { ...row, positionLabel: String(index + 1) };
    }

    let start = index;
    let end = index;
    const isSameTieGroup = (other) =>
      other?.unresolvedTie &&
      row.points === other.points &&
      row.headToHeadKey === other.headToHeadKey &&
      row.difference === other.difference &&
      row.scored === other.scored &&
      row.conductScore === other.conductScore;
    while (start > 0 && isSameTieGroup(rowsWithTieState[start - 1])) {
      start -= 1;
    }
    while (end < rowsWithTieState.length - 1 && isSameTieGroup(rowsWithTieState[end + 1])) {
      end += 1;
    }
    return { ...row, positionLabel: `${start + 1}/${end + 1}` };
  });
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
  const groups = getTournamentTeamGroups(tournament);
  const fixtureSections = getTournamentFixtureSections(tournament);
  const matchStatuses = payload.matchStatuses || {};
  const teamLogoMap = buildTeamLogoMap(payload);

  return groups.map((groupTeams, groupIndex) => {
    const teamStats = new Map(
      groupTeams.map((teamName) => [
        teamName,
        {
          team: teamName,
          groupOrder: groupTeams.indexOf(teamName),
          logo: teamLogoMap[teamName] || "",
          points: 0,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          scored: 0,
          contained: 0,
          difference: 0,
          conductScore: 0,
          yellow: 0,
          red: 0,
          penalty: 0,
        },
      ])
    );
    const groupSet = new Set(groupTeams);
    const groupMatches = [];

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
        groupMatches.push({
          away: match.away,
          awayScore: score.away,
          home: match.home,
          homeScore: score.home,
        });
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

        const winnerSide = getRegulationWinnerSide(statusRecord);
        if (winnerSide === "home") {
          if (homeStats) {
            homeStats.wins += 1;
            homeStats.points += 3;
          }
          if (awayStats) {
            awayStats.losses += 1;
          }
        } else if (winnerSide === "away") {
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

          if (
            event.action === "red" ||
            event.action === "direct-red" ||
            event.action === "second-yellow-red"
          ) {
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

        if (homeStats) {
          homeStats.conductScore += getConductScore(statusRecord?.events, match.home);
        }
        if (awayStats) {
          awayStats.conductScore += getConductScore(statusRecord?.events, match.away);
        }
      });
    });

    const rows = rankGroupRows(
      Array.from(teamStats.values())
      .map((team) => ({
        ...team,
        difference: team.scored - team.contained,
      })),
      groupMatches
    );

    return {
      title: tournament?.tournamentType === "league" ? "League" : getGroupLabel(groupIndex),
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
    penaltyGoals: 0,
  };

  current.value += 1;
  if (data.penaltyGoal) {
    current.penaltyGoals += 1;
  }
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
  const fairPlay = new Map();

  fixtureSections.forEach((section, sectionIndex) => {
    section.matches.forEach((match) => {
      const fixtureKey = getFixtureKey(sectionIndex, match.roundIndex, match.matchIndex);
      const statusRecord = matchStatuses[fixtureKey];

      if (!getMatchStatusHasStarted(statusRecord)) {
        return;
      }

      const score = getMatchScore(statusRecord);
      [match.home, match.away].forEach((teamName) => {
        const normalizedTeamName = String(teamName || "").trim();
        if (!normalizedTeamName) {
          return;
        }

        const current = fairPlay.get(normalizedTeamName) || {
          label: normalizedTeamName,
          team: "",
          value: 0,
        };
        current.value += getConductScore(statusRecord?.events, normalizedTeamName);
        fairPlay.set(normalizedTeamName, current);
      });

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

      const subjectYellowCounts = new Map();
      (statusRecord?.events || []).forEach((event) => {
        const subject = getSummarySubjectLabel(event, getMatchEventTeamName(event));
        const subjectKey = `${subject.team}::${subject.label}`;

        if (event.action === "goal" || event.action === "penalty-goal") {
          incrementSummaryStat(scorers, subjectKey, {
            ...subject,
            penaltyGoal: event.action === "penalty-goal",
          });
        }

        if (event.action === "assist") {
          incrementSummaryStat(assists, subjectKey, subject);
        }

        if (event.action === "yellow") {
          incrementSummaryStat(yellowCards, subjectKey, subject);
          const nextYellowCount = (subjectYellowCounts.get(subjectKey) || 0) + 1;
          subjectYellowCounts.set(subjectKey, nextYellowCount);
          if (nextYellowCount === 2) {
            incrementSummaryStat(redCards, subjectKey, subject);
          }
        }

        if (
          event.action === "red" ||
          event.action === "direct-red" ||
          event.action === "second-yellow-red"
        ) {
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
    { key: "fairPlay", title: "Fair Play", valueLabel: "Points", rows: sortSummaryRows(fairPlay) },
  ];
}
