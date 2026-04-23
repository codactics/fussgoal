import {
  buildTeamLogoMap,
  buildTournamentTables,
  formatMatchClock,
  getFixtureKey,
  getFixturePhaseLabel,
  getFixtureStatusLabel,
  getMatchClockSeconds,
  getMatchScore,
  getTournamentFixtureSections,
} from "./manageTournamentUtils";

const ACTION_LABELS = {
  goal: "Goal",
  assist: "Assist",
  red: "Red Card",
  yellow: "Yellow Card",
  "sub-in": "Sub In",
  "sub-out": "Sub Out",
  penalty: "Penalty",
  "penalty-goal": "Penalty Goal",
  "penalty-missed": "Penalty Missed",
  "free-kick": "Free Kick",
  corner: "Corner",
  other: "Other",
};

export function createLaunchedTournamentSlug(tournamentId) {
  return `launched-${tournamentId}`;
}

function slugifySegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createLaunchedMatchSlug(tournamentId, fixture) {
  const normalizedTournamentId = String(tournamentId || "").trim();
  const fixtureKey = String(fixture?.fixtureKey || "").trim();

  if (!normalizedTournamentId || !fixtureKey) {
    return "";
  }

  const homeTeam = slugifySegment(fixture?.homeTeam || fixture?.home || "home-team");
  const awayTeam = slugifySegment(fixture?.awayTeam || fixture?.away || "away-team");

  return `launched-${normalizedTournamentId}--${fixtureKey}--${homeTeam}-vs-${awayTeam}`;
}

export function parseLaunchedMatchSlug(slug) {
  const normalizedSlug = String(slug || "").trim();
  const match = normalizedSlug.match(/^launched-(.+?)--(\d+-\d+-\d+)(?:--.*)?$/);

  if (!match) {
    return null;
  }

  return {
    tournamentId: match[1],
    fixtureKey: match[2],
  };
}

export function getStoredImageUrl(imageValue) {
  if (!imageValue) {
    return "";
  }

  if (typeof imageValue === "string") {
    return imageValue;
  }

  return imageValue.url || imageValue.secure_url || imageValue.dataUrl || "";
}

export function getStoredImagePublicId(imageValue) {
  if (!imageValue || typeof imageValue === "string") {
    return "";
  }

  return imageValue.publicId || "";
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

function buildFixtureLineup(lineupRecord) {
  const rows = Array.isArray(lineupRecord?.rows) ? lineupRecord.rows : [];

  return {
    home: rows
      .filter((row) => String(row?.homePlayer || "").trim())
      .map((row) => ({
        player: String(row.homePlayer || ""),
        role: String(row.homeRole || "starting"),
      })),
    away: rows
      .filter((row) => String(row?.awayPlayer || "").trim())
      .map((row) => ({
        player: String(row.awayPlayer || ""),
        role: String(row.awayRole || "starting"),
      })),
  };
}

function formatTimelineEvent(entry) {
  if (entry.type === "kickoff") {
    return "Kick Off";
  }

  if (entry.type === "halftime") {
    return "Half Time";
  }

  if (entry.type === "fulltime") {
    return "Full Time";
  }

  const actionLabel = ACTION_LABELS[entry.action] || "Match Event";
  const subjectLabel = String(entry.subjectLabel || "").trim();
  const teamName = String(entry.teamName || "").trim();

  if (subjectLabel && teamName && subjectLabel !== teamName) {
    return `${actionLabel} - ${subjectLabel} (${teamName})`;
  }

  if (teamName) {
    return `${actionLabel} - ${teamName}`;
  }

  if (subjectLabel) {
    return `${actionLabel} - ${subjectLabel}`;
  }

  return actionLabel;
}

function buildTimelineEntries(statusRecord) {
  if (!statusRecord) {
    return [];
  }

  const systemMoments = statusRecord.systemMoments || {};
  const halfDurationMinutes = Number(statusRecord.halfDurationMinutes) || 0;
  const halfDurationSeconds = Math.max(0, halfDurationMinutes * 60);
  const totalDurationSeconds = halfDurationSeconds * 2;
  const systemEntries = [
    systemMoments.kickoff !== null
      ? { id: "kickoff", type: "kickoff", seconds: systemMoments.kickoff, order: 0, note: "" }
      : null,
    systemMoments.halftime !== null
      ? { id: "halftime", type: "halftime", seconds: systemMoments.halftime, order: 100000, note: "" }
      : null,
    systemMoments.fulltime !== null
      ? { id: "fulltime", type: "fulltime", seconds: systemMoments.fulltime, order: 200000, note: "" }
      : null,
  ].filter(Boolean);
  const eventEntries = Array.isArray(statusRecord.events)
    ? statusRecord.events.map((event, index) => ({
        ...event,
        type: "event",
        order: index + 10,
      }))
      : [];

  return [...systemEntries, ...eventEntries]
    .map((entry, index) => {
      const rawSeconds = Number(entry.seconds) || 0;
      let nextSeconds =
        statusRecord.matchStatus === "ended"
          ? Math.min(rawSeconds, totalDurationSeconds)
          : rawSeconds;
      let nextOrder = entry.order ?? index;

      if (entry.type === "event" && entry.half === "first" && systemMoments.halftime !== null) {
        nextSeconds = Math.min(rawSeconds, halfDurationSeconds);
        nextOrder -= 0.5;
      }

      if (entry.type === "event" && entry.half === "second" && systemMoments.fulltime !== null) {
        nextSeconds = Math.min(rawSeconds, totalDurationSeconds);
        nextOrder -= 0.5;
      }

      return {
        ...entry,
        id: entry.id || `timeline-${index + 1}`,
        seconds: nextSeconds,
        order: nextOrder,
        displayTime: formatMatchClock(nextSeconds),
        text: formatTimelineEvent(entry),
        note: String(entry.note || "").trim(),
      };
    })
    .sort((left, right) => (left.seconds || 0) - (right.seconds || 0) || left.order - right.order);
}

function normalizeFixtureSections(record, teamLogoMap, startDate) {
  const payload = record?.data || {};
  const matchStatuses = payload.matchStatuses || {};
  const matchLineups = payload.matchLineups || {};
  const matchTelecasts = payload.matchTelecasts || {};

  return getTournamentFixtureSections(record).map((section, sectionIndex) => ({
    title: section.title,
    kind: section.kind || "fixture",
    matches: section.matches.map((match) => {
      const fixtureKey = getFixtureKey(sectionIndex, match.roundIndex, match.matchIndex);
      const statusRecord = matchStatuses[fixtureKey] || null;
      const lineupRecord = matchLineups[fixtureKey] || null;
      const telecastRecord = matchTelecasts[fixtureKey] || null;
      const score = getMatchScore(statusRecord);
      const clockSeconds = statusRecord ? getMatchClockSeconds(statusRecord) : 0;

      return {
        id: `${fixtureKey}-${match.home}-${match.away}`,
        fixtureKey,
        matchSlug: createLaunchedMatchSlug(record.id, {
          fixtureKey,
          homeTeam: match.home,
          awayTeam: match.away,
        }),
        homeTeam: match.home,
        awayTeam: match.away,
        homeLogo: teamLogoMap[match.home] || "",
        awayLogo: teamLogoMap[match.away] || "",
        sectionTitle: section.title,
        sectionKind: section.kind || "fixture",
        status: getFixtureStatusLabel(statusRecord) || "Upcoming",
        phaseLabel: getFixturePhaseLabel(statusRecord),
        score,
        clockSeconds,
        clockText: statusRecord ? formatMatchClock(clockSeconds) : "",
        statusRecord,
        lineup: buildFixtureLineup(lineupRecord),
        timelineEntries: buildTimelineEntries(statusRecord),
        telecast: telecastRecord
          ? {
              url: String(telecastRecord.url || "").trim(),
              status:
                telecastRecord.status === "live" || telecastRecord.status === "paused"
                  ? telecastRecord.status
                  : "stopped",
              overlay:
                telecastRecord.overlay === "home" || telecastRecord.overlay === "away"
                  ? telecastRecord.overlay
                  : "none",
              bottomScore: Boolean(telecastRecord.bottomScore),
            }
          : null,
        date: match.date || startDate || "TBD",
        time: match.time || "TBD",
      };
    }),
  }));
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
  const teamLogoMap = buildTeamLogoMap(payload);
  const fixtureSections = normalizeFixtureSections(record, teamLogoMap, startDate);
  const normalizedGroups =
    record.tournamentType === "group" ? normalizeGroups(payload.groups, teamLogoMap) : [];
  const normalizedPointsTables = buildTournamentTables(record).map((groupTable) => ({
    name: groupTable.title,
    rows: groupTable.rows.map((row, index) => ({
      position: index + 1,
      team: row.team,
      logo: row.logo || "",
      played: row.played,
      won: row.wins,
      draw: row.draws,
      lost: row.losses,
      goalDifference: row.difference,
      points: row.points,
      scored: row.scored,
      contained: row.contained,
      yellow: row.yellow,
      red: row.red,
      penalty: row.penalty,
    })),
  }));
  const normalizedFixtures = fixtureSections.flatMap((section) => section.matches);

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
    fixtureSections,
    groups: normalizedGroups,
    pointsTables: normalizedPointsTables,
    startDate,
    endDate,
    tournamentType: record.tournamentType,
    tournamentLogo: payload.tournamentLogo || null,
  };
}
