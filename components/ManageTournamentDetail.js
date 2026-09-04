"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CreateTournamentWizard.module.css";
import { getStoredImageUrl } from "./launchedTournamentUtils";
import {
  buildOverallTournamentTable,
  buildRunnersUpTournamentTable,
  buildTournamentSummaryTables,
  buildTournamentTables,
  buildTeamLogoMap,
  buildWinnersTournamentTable,
  formatMatchClock,
  getFixtureKey,
  getFixturePhaseLabel,
  getFixtureStatusLabel,
  getGroupLabel,
  getMatchClockSeconds,
  getMatchScore,
  getMatchWinnerSide,
  getPenaltyShootoutWinnerSide,
  getTournamentFixtureSections,
  getTournamentTeamGroups,
  hasTournamentGroupStageStarted,
  OVERALL_GROUP_INDEX,
  RUNNERS_UP_TIER_GROUP_INDEX,
  WINNERS_TIER_GROUP_INDEX,
} from "./manageTournamentUtils";

const MAX_SQUAD_ROWS = 30;
const MIN_VISIBLE_ROWS = 5;
const SUMMARY_TABLE_KEYS = [
  "topScorer",
  "cleanSheet",
  "mostAssist",
  "yellowCard",
  "redCard",
  "fairPlay",
];
const KNOCKOUT_SOURCE_MANUAL = "manual";
const KNOCKOUT_SOURCE_GROUP_POSITION = "groupPosition";
const KNOCKOUT_SOURCE_OVERALL_POSITION = "overallPosition";
const KNOCKOUT_SOURCE_WINNERS_POSITION = "winnersPosition";
const KNOCKOUT_SOURCE_RUNNERS_UP_POSITION = "runnersUpPosition";
const KNOCKOUT_SOURCE_WINNER = "knockoutWinner";
const KNOCKOUT_SOURCE_LOSER = "knockoutLoser";
const OVERALL_MODE_MANUAL = "manual";
const OVERALL_MODE_AUTO = "auto";
const OVERALL_AUTO_KNOCKOUT_WINNER = "knockoutWinner";
const OVERALL_AUTO_KNOCKOUT_LOSER = "knockoutLoser";
const OVERALL_AUTO_TOP_SCORER = "topScorer";
const OVERALL_AUTO_CLEAN_SHEET = "cleanSheet";
const PLAYER_POSITIONS = [
  "Goalkeeper",
  "Center Back",
  "Left Back",
  "Right Back",
  "Sweeper",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Left Midfielder",
  "Right Midfielder",
  "Left Winger",
  "Right Winger",
  "Second Striker",
  "Striker",
  "Forward",
  "Other",
];

function createEmptyPlayerRow() {
  return {
    name: "",
    jerseyNumber: "",
    position: "",
    photo: null,
  };
}

function normalizeSquadPlayers(players) {
  const normalizedPlayers = Array.isArray(players)
    ? players.map((player) => ({
        name: String(player?.name || ""),
        jerseyNumber:
          player?.jerseyNumber === null || player?.jerseyNumber === undefined
            ? ""
            : String(player.jerseyNumber),
        position: String(player?.position || ""),
        photo: player?.photo || null,
      }))
    : [];

  const visibleRows = Math.max(MIN_VISIBLE_ROWS, normalizedPlayers.length || 0);
  const nextRows = normalizedPlayers.slice(0, MAX_SQUAD_ROWS);

  while (nextRows.length < Math.min(MAX_SQUAD_ROWS, visibleRows)) {
    nextRows.push(createEmptyPlayerRow());
  }

  return nextRows;
}

function createInitialKnockoutMatchForm() {
  return {
    title: "",
    home: "",
    away: "",
    homeSourceType: KNOCKOUT_SOURCE_MANUAL,
    awaySourceType: KNOCKOUT_SOURCE_MANUAL,
    homeGroupPosition: "",
    awayGroupPosition: "",
    homeOverallPosition: "",
    awayOverallPosition: "",
    homeWinnersPosition: "",
    awayWinnersPosition: "",
    homeRunnersUpPosition: "",
    awayRunnersUpPosition: "",
    homeWinnerMatchIndex: "",
    awayWinnerMatchIndex: "",
    homeLoserMatchIndex: "",
    awayLoserMatchIndex: "",
    includeInTable: false,
  };
}

function createInitialOverallSummary() {
  return {
    champion: { mode: OVERALL_MODE_MANUAL, team: "", knockoutMatchIndex: "" },
    runnerUp: { mode: OVERALL_MODE_MANUAL, team: "", knockoutMatchIndex: "" },
    bestGoalkeeper: { mode: OVERALL_MODE_MANUAL, playerKey: "" },
    topScorer: { mode: OVERALL_MODE_AUTO, playerKey: "" },
    bestPlayer: { mode: OVERALL_MODE_MANUAL, playerKey: "" },
    fairPlay: { mode: OVERALL_MODE_AUTO, team: "" },
  };
}

function normalizeOverallSummary(summary) {
  const defaults = createInitialOverallSummary();
  const source = summary && typeof summary === "object" ? summary : {};

  return {
    champion: {
      ...defaults.champion,
      ...(source.champion || {}),
    },
    runnerUp: {
      ...defaults.runnerUp,
      ...(source.runnerUp || {}),
    },
    bestGoalkeeper: {
      ...defaults.bestGoalkeeper,
      ...(source.bestGoalkeeper || {}),
    },
    topScorer: {
      ...defaults.topScorer,
      ...(source.topScorer || {}),
    },
    bestPlayer: {
      ...defaults.bestPlayer,
      ...(source.bestPlayer || {}),
    },
    fairPlay: {
      ...defaults.fairPlay,
      ...(source.fairPlay || {}),
    },
  };
}

function getKnockoutSourceType(source) {
  if (source?.type === KNOCKOUT_SOURCE_GROUP_POSITION) {
    const groupIndex = Number(source.groupIndex);

    if (groupIndex === OVERALL_GROUP_INDEX) {
      return KNOCKOUT_SOURCE_OVERALL_POSITION;
    }

    if (groupIndex === WINNERS_TIER_GROUP_INDEX) {
      return KNOCKOUT_SOURCE_WINNERS_POSITION;
    }

    if (groupIndex === RUNNERS_UP_TIER_GROUP_INDEX) {
      return KNOCKOUT_SOURCE_RUNNERS_UP_POSITION;
    }

    return KNOCKOUT_SOURCE_GROUP_POSITION;
  }

  if (source?.type === KNOCKOUT_SOURCE_WINNER) {
    return KNOCKOUT_SOURCE_WINNER;
  }

  if (source?.type === KNOCKOUT_SOURCE_LOSER) {
    return KNOCKOUT_SOURCE_LOSER;
  }

  return KNOCKOUT_SOURCE_MANUAL;
}

function createKnockoutMatchFormFromMatch(match) {
  const homeSourceType = getKnockoutSourceType(match?.homeSource);
  const awaySourceType = getKnockoutSourceType(match?.awaySource);

  return {
    title: String(match?.title || ""),
    home: String(match?.home || match?.homeSource?.team || ""),
    away: String(match?.away || match?.awaySource?.team || ""),
    homeSourceType,
    awaySourceType,
    homeGroupPosition:
      homeSourceType === KNOCKOUT_SOURCE_GROUP_POSITION
        ? `${match.homeSource.groupIndex}:${match.homeSource.rowIndex}`
        : "",
    awayGroupPosition:
      awaySourceType === KNOCKOUT_SOURCE_GROUP_POSITION
        ? `${match.awaySource.groupIndex}:${match.awaySource.rowIndex}`
        : "",
    homeOverallPosition:
      homeSourceType === KNOCKOUT_SOURCE_OVERALL_POSITION ? String(match.homeSource.rowIndex) : "",
    awayOverallPosition:
      awaySourceType === KNOCKOUT_SOURCE_OVERALL_POSITION ? String(match.awaySource.rowIndex) : "",
    homeWinnersPosition:
      homeSourceType === KNOCKOUT_SOURCE_WINNERS_POSITION ? String(match.homeSource.rowIndex) : "",
    awayWinnersPosition:
      awaySourceType === KNOCKOUT_SOURCE_WINNERS_POSITION ? String(match.awaySource.rowIndex) : "",
    homeRunnersUpPosition:
      homeSourceType === KNOCKOUT_SOURCE_RUNNERS_UP_POSITION ? String(match.homeSource.rowIndex) : "",
    awayRunnersUpPosition:
      awaySourceType === KNOCKOUT_SOURCE_RUNNERS_UP_POSITION ? String(match.awaySource.rowIndex) : "",
    homeWinnerMatchIndex:
      homeSourceType === KNOCKOUT_SOURCE_WINNER ? String(match.homeSource.matchIndex) : "",
    awayWinnerMatchIndex:
      awaySourceType === KNOCKOUT_SOURCE_WINNER ? String(match.awaySource.matchIndex) : "",
    homeLoserMatchIndex:
      homeSourceType === KNOCKOUT_SOURCE_LOSER ? String(match.homeSource.matchIndex) : "",
    awayLoserMatchIndex:
      awaySourceType === KNOCKOUT_SOURCE_LOSER ? String(match.awaySource.matchIndex) : "",
    includeInTable: Boolean(match?.includeInTable),
  };
}

function formatSummaryValue(summaryKey, row) {
  if (summaryKey === "topScorer" && row?.penaltyGoals) {
    return `${row.value}(${row.penaltyGoals})`;
  }

  return row?.value ?? 0;
}

function getTablePositionCode(tableTitle, rowIndex) {
  const title = String(tableTitle || "").trim();
  const groupMatch = title.match(/^Group\s+(.+)$/i);
  const prefix = groupMatch
    ? groupMatch[1].trim()
    : title === "League"
      ? "L"
      : title === "Overall"
        ? "ALL"
        : title === "Winners"
          ? "W"
          : title === "Runners-up"
            ? "R"
            : title;

  return `${prefix}${rowIndex + 1}`;
}

function getOrdinalSuffix(position) {
  const remainder100 = position % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return "th";
  }

  switch (position % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function getPlainOrdinal(position) {
  return `${position}${getOrdinalSuffix(position)}`;
}

function getTierOrdinal(position) {
  return position === 1 ? "Best" : `${getPlainOrdinal(position)} Best`;
}

function getGroupPositionExplanation(source) {
  if (source?.type !== KNOCKOUT_SOURCE_GROUP_POSITION) {
    return "";
  }

  const groupIndex = Number(source.groupIndex);
  const rowIndex = Number(source.rowIndex);

  if (!Number.isFinite(rowIndex) || rowIndex < 0) {
    return "";
  }

  const position = rowIndex + 1;

  if (groupIndex === WINNERS_TIER_GROUP_INDEX) {
    return `${getTierOrdinal(position)} Group Winner`;
  }

  if (groupIndex === RUNNERS_UP_TIER_GROUP_INDEX) {
    return `${getTierOrdinal(position)} Group Runner-up`;
  }

  if (groupIndex === OVERALL_GROUP_INDEX) {
    return `${getPlainOrdinal(position)} Overall`;
  }

  return `${getGroupLabel(groupIndex)} - ${getPlainOrdinal(position)} Place`;
}

function formatTeamWithSourceLabel(teamName, source, hasGroupStageStarted) {
  const team = String(teamName || "").trim();

  if (source?.type !== KNOCKOUT_SOURCE_GROUP_POSITION) {
    return team;
  }

  if (hasGroupStageStarted) {
    return team;
  }

  const label = String(source?.label || "").trim();

  if (!label) {
    return team;
  }

  const explanation = getGroupPositionExplanation(source);
  return explanation ? `${label} - ${explanation}` : label;
}

export default function ManageTournamentDetail({ isMasterAdmin = false, tournament }) {
  const [currentTournament, setCurrentTournament] = useState(tournament);
  const [activeTeam, setActiveTeam] = useState(null);
  const [isKnockoutModalOpen, setIsKnockoutModalOpen] = useState(false);
  const [editingKnockoutMatchIndex, setEditingKnockoutMatchIndex] = useState(null);
  const [knockoutMatchForm, setKnockoutMatchForm] = useState(createInitialKnockoutMatchForm);
  const [isSavingKnockoutMatch, setIsSavingKnockoutMatch] = useState(false);
  const [knockoutMessage, setKnockoutMessage] = useState("");
  const [squadRows, setSquadRows] = useState(() => normalizeSquadPlayers([]));
  const [squadStage, setSquadStage] = useState("players");
  const [captainSelection, setCaptainSelection] = useState({
    captain: "",
    viceCaptain1: "",
    viceCaptain2: "",
    viceCaptain3: "",
  });
  const [isSavingSquad, setIsSavingSquad] = useState(false);
  const [isUploadingPlayerPhoto, setIsUploadingPlayerPhoto] = useState(false);
  const [squadMessage, setSquadMessage] = useState("");
  const [overallSummaryForm, setOverallSummaryForm] = useState(() =>
    createInitialOverallSummary()
  );
  const [isSavingOverallSummary, setIsSavingOverallSummary] = useState(false);
  const [overallSummaryMessage, setOverallSummaryMessage] = useState("");
  const [timerNow, setTimerNow] = useState(Date.now());
  const [hiddenSummaryTables, setHiddenSummaryTables] = useState(() =>
    SUMMARY_TABLE_KEYS.reduce((accumulator, key) => {
      accumulator[key] = true;
      return accumulator;
    }, {})
  );
  const [pendingRestorePayload, setPendingRestorePayload] = useState(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const restoreFileInputRef = useRef(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState(null);
  const confirmPromptResolveRef = useRef(null);

  useEffect(() => {
    setCurrentTournament(tournament);
  }, [tournament]);

  useEffect(() => {
    setOverallSummaryForm(normalizeOverallSummary(tournament?.data?.overallSummary));
    setOverallSummaryMessage("");
  }, [tournament?.id, tournament?.data?.overallSummary]);

  useEffect(() => {
    if (!currentTournament?.id) {
      return undefined;
    }

    let isMounted = true;
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (response.ok && isMounted && result.tournament) {
          setCurrentTournament(result.tournament);
        }
      } catch {}
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentTournament?.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const payload = currentTournament?.data || {};
  const teamLogoMap = useMemo(() => buildTeamLogoMap(payload), [payload]);
  const groupList = useMemo(
    () => getTournamentTeamGroups(currentTournament),
    [currentTournament]
  );
  const fixtureSections = getTournamentFixtureSections(currentTournament);
  const squadData = payload.teamSquads || {};
  const matchStatuses = payload.matchStatuses || {};
  const hasGroupStageStarted = useMemo(
    () => hasTournamentGroupStageStarted(currentTournament),
    [currentTournament]
  );
  const tournamentTables = useMemo(
    () => buildTournamentTables(currentTournament),
    [currentTournament]
  );
  const overallTournamentTable = useMemo(
    () => buildOverallTournamentTable(currentTournament),
    [currentTournament]
  );
  const winnersTournamentTable = useMemo(
    () => buildWinnersTournamentTable(currentTournament),
    [currentTournament]
  );
  const runnersUpTournamentTable = useMemo(
    () => buildRunnersUpTournamentTable(currentTournament),
    [currentTournament]
  );

  function renderTournamentTableCard(table, { cardClassName, displayTitle, keySuffix } = {}) {
    if (!table) {
      return null;
    }

    return (
      <div
        className={cardClassName ? `${styles.manageFixtureCard} ${cardClassName}` : styles.manageFixtureCard}
        key={`${currentTournament.id}-${keySuffix}-table`}
      >
        <h5 className={styles.manageFixtureTitle}>{displayTitle || table.title}</h5>
        <div className={styles.tournamentTableWrap}>
          <table className={styles.tournamentTable}>
            <thead>
              <tr>
                <th>Position</th>
                <th>Team</th>
                <th>Points</th>
                <th>Played</th>
                <th>W</th>
                <th>L</th>
                <th>D</th>
                <th>Scored</th>
                <th>Contained</th>
                <th>GD</th>
                <th>Yellow</th>
                <th>Red</th>
                <th>Fair Play</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`${keySuffix}-${row.team}`}>
                  <td>{row.positionLabel || rowIndex + 1}</td>
                  <td>{row.team}</td>
                  <td>{row.points}</td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.draws}</td>
                  <td>{row.scored}</td>
                  <td>{row.contained}</td>
                  <td>{row.difference}</td>
                  <td>{row.yellow}</td>
                  <td>{row.red}</td>
                  <td>{row.fairPlayScore ?? row.conductScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderKnockoutPositionPreview(table, { displayTitle, keySuffix } = {}) {
    if (!table) {
      return null;
    }

    return (
      <div className={styles.knockoutTeamGroup} key={`knockout-${keySuffix}-preview`}>
        <p className={styles.knockoutTeamGroupTitle}>{displayTitle || table.title}</p>
        {table.rows.length ? (
          <div className={styles.knockoutTeamTable}>
            <div className={styles.knockoutTeamTableHead}>
              <span>Team</span>
              <span>Pts</span>
            </div>
            {table.rows.map((row, rowIndex) => (
              <div className={styles.knockoutTeamTableRow} key={`knockout-${keySuffix}-preview-${row.team}`}>
                <span className={styles.knockoutTeamName}>
                  {row.team} ({getTablePositionCode(table.title, rowIndex)})
                </span>
                <span className={styles.knockoutTeamPoints}>{row.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.knockoutTeamName}>No table data yet.</p>
        )}
      </div>
    );
  }

  const tournamentSummaryTables = useMemo(
    () => buildTournamentSummaryTables(currentTournament),
    [currentTournament]
  );
  const allTeamOptions = useMemo(
    () =>
      groupList
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter((team, index, teams) => teams.indexOf(team) === index)
        .sort((left, right) => left.localeCompare(right)),
    [groupList]
  );
  const duplicateSquadNames = useMemo(() => {
    const counts = new Map();

    squadRows.forEach((row) => {
      const key = String(row?.name || "").trim().toLowerCase();

      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [squadRows]);
  const allPlayerOptions = useMemo(() => {
    const seenKeys = new Map();

    return allTeamOptions.flatMap((teamName) => {
      const players = Array.isArray(squadData?.[teamName]?.players)
        ? squadData[teamName].players
        : [];

      return players
        .filter((player) => String(player?.name || "").trim())
        .map((player) => {
          const playerName = String(player.name || "").trim();
          const baseKey = `${teamName}::${playerName}`;
          const seenCount = seenKeys.get(baseKey) || 0;
          seenKeys.set(baseKey, seenCount + 1);

          return {
            key: seenCount === 0 ? baseKey : `${baseKey}#${seenCount + 1}`,
            label:
              seenCount === 0
                ? `${playerName} (${teamName})`
                : `${playerName} (${teamName}) #${seenCount + 1}`,
            playerName,
            teamName,
          };
        });
    });
  }, [allTeamOptions, squadData]);
  const knockoutMatchOptions = useMemo(() => {
    return fixtureSections
      .map((section, sectionIndex) =>
        section.kind === "knockout"
          ? {
              label: section.title,
              match: section.matches?.[0] || null,
              matchIndex: section.matches?.[0]?.matchIndex ?? "",
              sectionIndex,
            }
          : null
      )
      .filter(Boolean);
  }, [fixtureSections]);
  function toggleSummaryTable(summaryKey) {
    setHiddenSummaryTables((current) => ({
      ...current,
      [summaryKey]: !current[summaryKey],
    }));
  }

  function updateOverallSummaryField(fieldName, updates) {
    setOverallSummaryForm((current) => ({
      ...current,
      [fieldName]: {
        ...current[fieldName],
        ...updates,
      },
    }));
    setOverallSummaryMessage("");
  }

  function getSelectedPlayerLabel(playerKey) {
    return allPlayerOptions.find((player) => player.key === playerKey)?.label || "";
  }

  function getSummaryLeader(summaryKey) {
    const summaryTable = tournamentSummaryTables.find((table) => table.key === summaryKey);
    const leader = summaryTable?.rows?.[0] || null;

    if (!leader) {
      return "";
    }

    return leader.team ? `${leader.label} (${leader.team})` : leader.label;
  }

  function getFairPlayTeamLabel(teamName = "") {
    const team = tournamentSummaryTables
      .find((table) => table.key === "fairPlay")
      ?.rows?.find((row) => row.label === teamName);

    return team ? `${team.label} (${team.value ?? 0})` : teamName;
  }

  function getFairPlayLeader() {
    const leader = tournamentSummaryTables.find((table) => table.key === "fairPlay")?.rows?.[0];
    if (!leader) {
      return "";
    }

    return `${leader.label} (${leader.value ?? 0})`;
  }

  function getKnockoutResultTeam(matchIndex, resultKind) {
    const selectedOption = knockoutMatchOptions.find(
      (option) => String(option.matchIndex) === String(matchIndex)
    );

    if (!selectedOption?.match) {
      return "";
    }

    const fixtureKey = getFixtureKey(selectedOption.sectionIndex, 0, selectedOption.matchIndex);
    const statusRecord = matchStatuses[fixtureKey];
    const winnerSide = getMatchWinnerSide(statusRecord);

    if (winnerSide !== "home" && winnerSide !== "away") {
      return "";
    }

    const targetSide =
      resultKind === OVERALL_AUTO_KNOCKOUT_LOSER
        ? winnerSide === "home"
          ? "away"
          : "home"
        : winnerSide;

    return String(selectedOption.match[targetSide] || "").trim();
  }

  function getOverallSummaryPreview(fieldName) {
    const field = overallSummaryForm[fieldName] || {};

    if (fieldName === "champion") {
      if (field.mode === OVERALL_MODE_AUTO) {
        return getKnockoutResultTeam(field.knockoutMatchIndex, OVERALL_AUTO_KNOCKOUT_WINNER);
      }

      return field.team || "";
    }

    if (fieldName === "runnerUp") {
      if (field.mode === OVERALL_MODE_AUTO) {
        return getKnockoutResultTeam(field.knockoutMatchIndex, OVERALL_AUTO_KNOCKOUT_LOSER);
      }

      return field.team || "";
    }

    if (fieldName === "bestGoalkeeper") {
      return field.mode === OVERALL_MODE_AUTO
        ? getSummaryLeader(OVERALL_AUTO_CLEAN_SHEET)
        : getSelectedPlayerLabel(field.playerKey);
    }

    if (fieldName === "topScorer") {
      return field.mode === OVERALL_MODE_AUTO
        ? getSummaryLeader(OVERALL_AUTO_TOP_SCORER)
        : getSelectedPlayerLabel(field.playerKey);
    }

    if (fieldName === "bestPlayer") {
      return getSelectedPlayerLabel(field.playerKey);
    }

    if (fieldName === "fairPlay") {
      return field.mode === OVERALL_MODE_AUTO
        ? getFairPlayLeader()
        : getFairPlayTeamLabel(field.team);
    }

    return "";
  }

  async function handleSaveOverallSummary() {
    if (!currentTournament) {
      return;
    }

    setIsSavingOverallSummary(true);
    setOverallSummaryMessage("");

    try {
      const nextData = {
        ...payload,
        overallSummary: overallSummaryForm,
      };
      const nextTournament = {
        ...currentTournament,
        data: nextData,
      };
      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the overall summary.");
      }

      setCurrentTournament(result.tournament || nextTournament);
      setOverallSummaryMessage("Overall summary saved.");
    } catch (error) {
      setOverallSummaryMessage(error.message || "Unable to save the overall summary.");
    } finally {
      setIsSavingOverallSummary(false);
    }
  }

  function getTeamSquadRecord(teamName) {
    const record = squadData?.[teamName];

    return {
      players: Array.isArray(record?.players) ? record.players : [],
      captain: String(record?.captain || ""),
      viceCaptain1: String(record?.viceCaptain1 || ""),
      viceCaptain2: String(record?.viceCaptain2 || ""),
      viceCaptain3: String(record?.viceCaptain3 || ""),
    };
  }

  function openSquadModal(teamName) {
    const teamRecord = getTeamSquadRecord(teamName);
    setActiveTeam(teamName);
    setSquadRows(normalizeSquadPlayers(teamRecord.players));
    setCaptainSelection({
      captain: teamRecord.captain,
      viceCaptain1: teamRecord.viceCaptain1,
      viceCaptain2: teamRecord.viceCaptain2,
      viceCaptain3: teamRecord.viceCaptain3,
    });
    setSquadStage(teamRecord.players.length ? "leaders" : "players");
    setSquadMessage("");
  }

  function closeSquadModal() {
    setActiveTeam(null);
    setSquadRows(normalizeSquadPlayers([]));
    setCaptainSelection({
      captain: "",
      viceCaptain1: "",
      viceCaptain2: "",
      viceCaptain3: "",
    });
    setSquadStage("players");
    setSquadMessage("");
    setIsUploadingPlayerPhoto(false);
  }

  function openKnockoutModal() {
    setEditingKnockoutMatchIndex(null);
    setKnockoutMatchForm(createInitialKnockoutMatchForm());
    setKnockoutMessage("");
    setIsKnockoutModalOpen(true);
  }

  function openEditKnockoutModal(matchIndex) {
    const match = Array.isArray(payload.knockoutMatches) ? payload.knockoutMatches[matchIndex] : null;

    if (!match) {
      return;
    }

    setEditingKnockoutMatchIndex(matchIndex);
    setKnockoutMatchForm(createKnockoutMatchFormFromMatch(match));
    setKnockoutMessage("");
    setIsKnockoutModalOpen(true);
  }

  function closeKnockoutModal() {
    setIsKnockoutModalOpen(false);
    setEditingKnockoutMatchIndex(null);
    setKnockoutMatchForm(createInitialKnockoutMatchForm());
    setKnockoutMessage("");
  }

  function updateSquadRow(rowIndex, field, value) {
    setSquadRows((currentRows) =>
      currentRows.map((row, currentIndex) =>
        currentIndex === rowIndex ? { ...row, [field]: value } : row
      )
    );
  }

  function addSquadRow() {
    setSquadRows((currentRows) => {
      if (currentRows.length >= MAX_SQUAD_ROWS) {
        return currentRows;
      }

      return [...currentRows, createEmptyPlayerRow()];
    });
  }

  async function uploadPlayerPhoto(rowIndex, file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "player");

    setIsUploadingPlayerPhoto(true);
    setSquadMessage(`Uploading ${file.name}...`);

    try {
      const response = await fetch("/api/uploads/logo", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to upload the player photo.");
      }

      updateSquadRow(rowIndex, "photo", result.image || null);
      setSquadMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setSquadMessage(error.message);
    } finally {
      setIsUploadingPlayerPhoto(false);
    }
  }

  function getPreparedPlayers() {
    return squadRows
      .map((row) => ({
        name: row.name.trim(),
        jerseyNumber: row.jerseyNumber === "" ? "" : row.jerseyNumber.trim(),
        position: row.position,
        photo: row.photo || null,
      }))
      .filter((row) => row.name);
  }

  function persistTournamentRecord(nextData) {
    setCurrentTournament((current) => ({
      ...current,
      data: nextData,
    }));
  }

  async function saveTournamentData(nextData, successMessage) {
    if (!currentTournament) {
      return false;
    }

    setIsSavingSquad(true);
    setSquadMessage("");

    try {
      const nextTournament = {
        ...currentTournament,
        data: nextData,
      };

      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save squad right now.");
      }

      persistTournamentRecord(result.tournament.data || nextData);
      setSquadMessage(successMessage);
      return true;
    } catch (error) {
      setSquadMessage(error.message);
      return false;
    } finally {
      setIsSavingSquad(false);
    }
  }

  async function handleSaveKnockoutMatch() {
    const title = knockoutMatchForm.title.trim();
    const home = knockoutMatchForm.home.trim();
    const away = knockoutMatchForm.away.trim();
    const homeSource = buildKnockoutTeamSource("home");
    const awaySource = buildKnockoutTeamSource("away");

    if (!title) {
      setKnockoutMessage("Match name is required.");
      return;
    }

    if (!home || !away) {
      setKnockoutMessage("Select both teams for the knockout match.");
      return;
    }

    if (home === away) {
      setKnockoutMessage("Choose two different teams.");
      return;
    }

    if (!currentTournament) {
      return;
    }

    setIsSavingKnockoutMatch(true);
    setKnockoutMessage("");

    try {
      const currentKnockoutMatches = Array.isArray(payload.knockoutMatches)
        ? payload.knockoutMatches
        : [];
      const savedMatch = {
        ...(editingKnockoutMatchIndex !== null
          ? currentKnockoutMatches[editingKnockoutMatchIndex] || {}
          : {}),
          title,
          home,
          away,
          homeSource,
          awaySource,
          includeInTable: Boolean(knockoutMatchForm.includeInTable),
        createdAt:
          editingKnockoutMatchIndex !== null
            ? currentKnockoutMatches[editingKnockoutMatchIndex]?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextKnockoutMatches =
        editingKnockoutMatchIndex === null
          ? [...currentKnockoutMatches, savedMatch]
          : currentKnockoutMatches.map((match, matchIndex) =>
              matchIndex === editingKnockoutMatchIndex ? savedMatch : match
            );

      const nextTournament = {
        ...currentTournament,
        data: {
          ...payload,
          knockoutMatches: nextKnockoutMatches,
        },
      };

      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create the knockout match.");
      }

      setCurrentTournament(result.tournament || nextTournament);
      closeKnockoutModal();
    } catch (error) {
      setKnockoutMessage(error.message || "Unable to save the knockout match.");
    } finally {
      setIsSavingKnockoutMatch(false);
    }
  }

  async function handleSaveSquadPlayers() {
    const preparedPlayers = getPreparedPlayers();

    if (!preparedPlayers.length) {
      setSquadMessage("Enter at least one player name before saving the squad.");
      return;
    }

    const hasEmptyNamedRow = squadRows.some((row) => row.name.trim() === "" && row.jerseyNumber !== "");
    if (hasEmptyNamedRow) {
      setSquadMessage("Player name is required for any row that has other details.");
      return;
    }

    const duplicateNames = new Set();
    for (const player of preparedPlayers) {
      const normalizedName = player.name.toLowerCase();
      if (duplicateNames.has(normalizedName)) {
        setSquadMessage("Player names must be unique within the squad.");
        return;
      }
      duplicateNames.add(normalizedName);

      if (player.jerseyNumber !== "" && !/^\d+$/.test(player.jerseyNumber)) {
        setSquadMessage("Jersey number can contain only digits.");
        return;
      }
    }

    const nextData = {
      ...payload,
      teamSquads: {
        ...(payload.teamSquads || {}),
        [activeTeam]: {
          ...(payload.teamSquads?.[activeTeam] || {}),
          players: preparedPlayers.map((player) => ({
            ...player,
            jerseyNumber: player.jerseyNumber === "" ? null : Number(player.jerseyNumber),
          })),
        },
      },
    };

    const saved = await saveTournamentData(
      nextData,
      `Squad saved for ${activeTeam}. Now choose captain and vice captains.`
    );

    if (saved) {
      setSquadStage("leaders");
    }
  }

  function getEligiblePlayerNames(excludedNames) {
    const preparedPlayers = getPreparedPlayers();

    return preparedPlayers
      .map((player) => player.name)
      .filter((playerName) => !excludedNames.includes(playerName));
  }

  function getLeadershipOptions(fieldName) {
    const allPlayerNames = getPreparedPlayers().map((player) => player.name);
    const currentValue = captainSelection[fieldName];
    const selectedElsewhere = new Set(
      Object.entries(captainSelection)
        .filter(([key, value]) => key !== fieldName && value)
        .map(([, value]) => value)
    );

    return allPlayerNames.filter(
      (playerName, index) =>
        allPlayerNames.indexOf(playerName) === index &&
        (playerName === currentValue || !selectedElsewhere.has(playerName))
    );
  }

  function getKnockoutTeamOptions(fieldName) {
    const currentValue = knockoutMatchForm[fieldName];
    const otherFieldName = fieldName === "home" ? "away" : "home";
    const otherSelectedValue = knockoutMatchForm[otherFieldName];

    return groupList.map((group, groupIndex) => ({
      label: getGroupLabel(groupIndex),
      teams: group.filter((team) => team === currentValue || team !== otherSelectedValue),
    }));
  }

  function getKnockoutGroupPositionOptions() {
    return tournamentTables.flatMap((groupTable, groupIndex) =>
      groupTable.rows.map((row, rowIndex) => {
        const sourceLabel = getTablePositionCode(groupTable.title, rowIndex);

        return {
          label: `${row.team} (${sourceLabel})`,
          sourceLabel,
          team: row.team,
          value: `${groupIndex}:${rowIndex}`,
        };
      })
    );
  }

  function getKnockoutTierPositionOptions(table) {
    if (!table) {
      return [];
    }

    return table.rows.map((row, rowIndex) => {
      const sourceLabel = getTablePositionCode(table.title, rowIndex);

      return {
        label: `${row.team} (${sourceLabel})`,
        sourceLabel,
        team: row.team,
        value: String(rowIndex),
      };
    });
  }

  function getKnockoutOverallPositionOptions() {
    return getKnockoutTierPositionOptions(overallTournamentTable);
  }

  function getKnockoutWinnersPositionOptions() {
    return getKnockoutTierPositionOptions(winnersTournamentTable);
  }

  function getKnockoutRunnersUpPositionOptions() {
    return getKnockoutTierPositionOptions(runnersUpTournamentTable);
  }

  function getSavedKnockoutMatchOptions() {
    return (Array.isArray(payload.knockoutMatches) ? payload.knockoutMatches : []).map(
      (match, matchIndex) => ({
        label: match?.title || `Knockout Match ${matchIndex + 1}`,
        value: String(matchIndex),
      })
    );
  }

  function updateKnockoutSource(fieldName, sourceType) {
    const sourceTypeKey = `${fieldName}SourceType`;
    const groupPositionKey = `${fieldName}GroupPosition`;
    const overallPositionKey = `${fieldName}OverallPosition`;
    const winnersPositionKey = `${fieldName}WinnersPosition`;
    const runnersUpPositionKey = `${fieldName}RunnersUpPosition`;
    const winnerMatchIndexKey = `${fieldName}WinnerMatchIndex`;
    const loserMatchIndexKey = `${fieldName}LoserMatchIndex`;

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: "",
      [sourceTypeKey]: sourceType,
      [groupPositionKey]: "",
      [overallPositionKey]: "",
      [winnersPositionKey]: "",
      [runnersUpPositionKey]: "",
      [winnerMatchIndexKey]: "",
      [loserMatchIndexKey]: "",
    }));
  }

  function updateKnockoutGroupPosition(fieldName, value) {
    const selectedOption = getKnockoutGroupPositionOptions().find((option) => option.value === value);

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption?.team || "",
      [`${fieldName}GroupPosition`]: value,
    }));
  }

  function updateKnockoutOverallPosition(fieldName, value) {
    const selectedOption = getKnockoutOverallPositionOptions().find((option) => option.value === value);

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption?.team || "",
      [`${fieldName}OverallPosition`]: value,
    }));
  }

  function updateKnockoutWinnersPosition(fieldName, value) {
    const selectedOption = getKnockoutWinnersPositionOptions().find((option) => option.value === value);

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption?.team || "",
      [`${fieldName}WinnersPosition`]: value,
    }));
  }

  function updateKnockoutRunnersUpPosition(fieldName, value) {
    const selectedOption = getKnockoutRunnersUpPositionOptions().find((option) => option.value === value);

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption?.team || "",
      [`${fieldName}RunnersUpPosition`]: value,
    }));
  }

  function updateKnockoutWinnerSource(fieldName, matchIndex) {
    const selectedOption = getSavedKnockoutMatchOptions().find(
      (option) => option.value === matchIndex
    );

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption ? `Winner of ${selectedOption.label}` : "",
      [`${fieldName}WinnerMatchIndex`]: matchIndex,
    }));
  }

  function updateKnockoutLoserSource(fieldName, matchIndex) {
    const selectedOption = getSavedKnockoutMatchOptions().find(
      (option) => option.value === matchIndex
    );

    setKnockoutMatchForm((current) => ({
      ...current,
      [fieldName]: selectedOption ? `Loser of ${selectedOption.label}` : "",
      [`${fieldName}LoserMatchIndex`]: matchIndex,
    }));
  }

  function buildKnockoutTeamSource(fieldName) {
    const sourceType = knockoutMatchForm[`${fieldName}SourceType`];

    if (sourceType === KNOCKOUT_SOURCE_GROUP_POSITION) {
      const selectedOption = getKnockoutGroupPositionOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}GroupPosition`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_GROUP_POSITION,
            groupIndex: Number.parseInt(selectedOption.value.split(":")[0], 10),
            label: selectedOption.sourceLabel,
            rowIndex: Number.parseInt(selectedOption.value.split(":")[1], 10),
            team: selectedOption.team,
          }
        : null;
    }

    if (sourceType === KNOCKOUT_SOURCE_OVERALL_POSITION) {
      const selectedOption = getKnockoutOverallPositionOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}OverallPosition`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_GROUP_POSITION,
            groupIndex: OVERALL_GROUP_INDEX,
            label: selectedOption.sourceLabel,
            rowIndex: Number.parseInt(selectedOption.value, 10),
            team: selectedOption.team,
          }
        : null;
    }

    if (sourceType === KNOCKOUT_SOURCE_WINNERS_POSITION) {
      const selectedOption = getKnockoutWinnersPositionOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}WinnersPosition`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_GROUP_POSITION,
            groupIndex: WINNERS_TIER_GROUP_INDEX,
            label: selectedOption.sourceLabel,
            rowIndex: Number.parseInt(selectedOption.value, 10),
            team: selectedOption.team,
          }
        : null;
    }

    if (sourceType === KNOCKOUT_SOURCE_RUNNERS_UP_POSITION) {
      const selectedOption = getKnockoutRunnersUpPositionOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}RunnersUpPosition`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_GROUP_POSITION,
            groupIndex: RUNNERS_UP_TIER_GROUP_INDEX,
            label: selectedOption.sourceLabel,
            rowIndex: Number.parseInt(selectedOption.value, 10),
            team: selectedOption.team,
          }
        : null;
    }

    if (sourceType === KNOCKOUT_SOURCE_WINNER) {
      const selectedOption = getSavedKnockoutMatchOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}WinnerMatchIndex`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_WINNER,
            label: `Winner of ${selectedOption.label}`,
            matchIndex: Number.parseInt(selectedOption.value, 10),
          }
        : null;
    }

    if (sourceType === KNOCKOUT_SOURCE_LOSER) {
      const selectedOption = getSavedKnockoutMatchOptions().find(
        (option) => option.value === knockoutMatchForm[`${fieldName}LoserMatchIndex`]
      );

      return selectedOption
        ? {
            type: KNOCKOUT_SOURCE_LOSER,
            label: `Loser of ${selectedOption.label}`,
            matchIndex: Number.parseInt(selectedOption.value, 10),
          }
        : null;
    }

    return null;
  }

  function requestAdminConfirm({ title, message, okLabel = "OK" }) {
    setPendingConfirmAction({ title, message, okLabel });

    return new Promise((resolve) => {
      confirmPromptResolveRef.current = resolve;
    });
  }

  function closeAdminConfirmPrompt(result) {
    setPendingConfirmAction(null);

    if (confirmPromptResolveRef.current) {
      confirmPromptResolveRef.current(result);
      confirmPromptResolveRef.current = null;
    }
  }

  async function handleSaveLeadership() {
    const preparedPlayers = getPreparedPlayers();
    const playerNames = preparedPlayers.map((player) => player.name);

    if (duplicateSquadNames.size > 0) {
      setSquadStage("players");
      setSquadMessage(
        "Two or more players share the same name. Make every player name unique before saving."
      );
      return;
    }

    if (!captainSelection.captain) {
      const proceedWithoutCaptain = await requestAdminConfirm({
        title: "Captain not selected",
        message:
          "No captain has been selected for this squad. Do you want to save the leadership without a captain?",
        okLabel: "Save without captain",
      });

      if (!proceedWithoutCaptain) {
        return;
      }
    } else if (!playerNames.includes(captainSelection.captain)) {
      setSquadMessage("Captain must be selected from the saved squad.");
      return;
    }

    const selections = [
      captainSelection.captain,
      captainSelection.viceCaptain1,
      captainSelection.viceCaptain2,
      captainSelection.viceCaptain3,
    ].filter(Boolean);

    if (new Set(selections).size !== selections.length) {
      setSquadMessage("Captain and vice captains must all be different players.");
      return;
    }

    const nextData = {
      ...payload,
      teamSquads: {
        ...(payload.teamSquads || {}),
        [activeTeam]: {
          ...(payload.teamSquads?.[activeTeam] || {}),
          players: preparedPlayers.map((player) => ({
            ...player,
            jerseyNumber: player.jerseyNumber === "" ? null : Number(player.jerseyNumber),
          })),
          captain: captainSelection.captain,
          viceCaptain1: captainSelection.viceCaptain1,
          viceCaptain2: captainSelection.viceCaptain2,
          viceCaptain3: captainSelection.viceCaptain3,
        },
      },
    };

    const saved = await saveTournamentData(nextData, `${activeTeam} squad leadership saved.`);

    if (saved) {
      closeSquadModal();
    }
  }

  function handleDownloadBackup() {
    if (!currentTournament) {
      return;
    }

    const fileNameBase =
      String(currentTournament.name || "tournament")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tournament";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${fileNameBase}-backup-${timestamp}.json`;

    const blob = new Blob([JSON.stringify(currentTournament, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleRestoreFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setRestoreMessage("");

    const reader = new FileReader();
    reader.onload = () => {
      if (restoreFileInputRef.current) {
        restoreFileInputRef.current.value = "";
      }

      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const name = String(parsed?.name || "").trim();

        if (!name || !parsed?.data || typeof parsed.data !== "object") {
          setRestoreMessage("This file doesn't look like a valid tournament backup.");
          return;
        }

        setPendingRestorePayload(parsed);
      } catch {
        setRestoreMessage("Unable to read that file. Make sure it is a tournament backup JSON file.");
      }
    };
    reader.onerror = () => {
      setRestoreMessage("Unable to read that file.");
      if (restoreFileInputRef.current) {
        restoreFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  function cancelRestoreBackup() {
    setPendingRestorePayload(null);
  }

  async function confirmRestoreBackup() {
    if (!pendingRestorePayload || !currentTournament) {
      return;
    }

    setIsRestoringBackup(true);
    setRestoreMessage("");

    try {
      const nextTournament = {
        ...pendingRestorePayload,
        id: currentTournament.id,
      };

      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to restore the tournament from backup.");
      }

      setCurrentTournament(result.tournament || nextTournament);
      setRestoreMessage("Tournament data restored from the uploaded backup.");
    } catch (error) {
      setRestoreMessage(error.message || "Unable to restore the tournament from backup.");
    } finally {
      setIsRestoringBackup(false);
      setPendingRestorePayload(null);
    }
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <div className={styles.manageDetailSection}>
      {isMasterAdmin ? (
        <div className={styles.manageSectionCard}>
          <h4 className={styles.manageSectionTitle}>Restore Tournament From Backup</h4>
          <p className={styles.passwordText}>
            Upload a previously downloaded backup JSON file to replace this tournament&apos;s
            groups &amp; teams, squads, fixtures, live match events and scores, tournament tables,
            knockout matches, and overall summary with what&apos;s in the file. This overwrites
            everything currently saved for this tournament and cannot be undone.
          </p>
          <input
            accept="application/json,.json"
            disabled={isRestoringBackup}
            onChange={handleRestoreFileChange}
            ref={restoreFileInputRef}
            type="file"
          />
          {restoreMessage ? <p className={styles.status}>{restoreMessage}</p> : null}
        </div>
      ) : null}

      <div className={styles.manageDetailHeader}>
        <div>
          <p className={styles.eyebrowLabel}>Selected Tournament</p>
          <h3 className={styles.manageDetailTitle}>{currentTournament.name}</h3>
        </div>
        <p className={styles.resultMeta}>
          Type: {currentTournament.tournamentType === "league" ? "League" : "Group"}
        </p>
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 1: Groups & Teams</h4>
        {groupList.length ? (
          <div className={styles.manageGroupGrid}>
            {groupList.map((group, index) => (
              <div className={styles.manageGroupCard} key={`${currentTournament.id}-group-${index + 1}`}>
                <h5 className={styles.manageGroupTitle}>
                  {currentTournament.tournamentType === "league" ? "League Teams" : getGroupLabel(index)}
                </h5>
                <div className={styles.manageTeamList}>
                  {group.map((team) => (
                    <button
                      className={styles.manageTeamButton}
                      key={`${currentTournament.id}-${team}`}
                      onClick={() => openSquadModal(team)}
                      type="button"
                    >
                      {teamLogoMap[team] ? (
                        <img
                          alt={`${team} logo`}
                          className={styles.manageTeamLogo}
                          src={teamLogoMap[team]}
                        />
                      ) : (
                        <div className={styles.manageTeamLogoFallback}>{team.slice(0, 1)}</div>
                      )}
                      <span className={styles.manageTeamName}>{team}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No groups available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 2: Match Fixtures</h4>
        {fixtureSections.length ? (
          <div className={styles.manageFixturesStack}>
            {fixtureSections.map((section, sectionIndex) => (
              <div className={styles.manageFixtureCard} key={`${currentTournament.id}-${section.title}`}>
                <h5 className={styles.manageFixtureTitle}>{section.title}</h5>
                <div className={styles.fixtureRowList}>
                  {section.matches.length ? (
                    section.matches.map((match) => {
                      const fixtureKey = getFixtureKey(
                        sectionIndex,
                        match.roundIndex,
                        match.matchIndex
                      );
                      const matchStatus = matchStatuses[fixtureKey];
                      const statusLabel = getFixtureStatusLabel(matchStatus);
                      const phaseLabel = getFixturePhaseLabel(matchStatus);
                      const score = getMatchScore(matchStatus);
                      const penaltyWinnerSide = getPenaltyShootoutWinnerSide(matchStatus);
                      const clockText = matchStatus
                        ? formatMatchClock(getMatchClockSeconds(matchStatus, timerNow))
                        : "";
                      const hasScheduledDate = Boolean(match.date && match.date !== "TBD");
                      const hasScheduledTime = Boolean(match.time && match.time !== "TBD");
                      const hasSchedule = hasScheduledDate || hasScheduledTime;
                      const displayStatusLabel = statusLabel || (hasSchedule ? "Upcoming" : "");
                      const scheduleText = hasSchedule
                        ? [hasScheduledDate ? match.date : "", hasScheduledTime ? match.time : ""]
                            .filter(Boolean)
                            .join(" | ")
                        : "";

                      const isKnockoutMatch = section.kind === "knockout";

                      return (
                        <div
                          className={styles.fixtureRowWithAction}
                          key={`${currentTournament.id}-${section.title}-${match.roundIndex}-${match.matchIndex}-${match.home}-${match.away}`}
                        >
                          <Link
                            className={styles.fixtureRowLink}
                            href={`/admin/dashboard/${currentTournament.id}/fixture/${sectionIndex}/${match.roundIndex}/${match.matchIndex}`}
                          >
                            <span className={styles.fixtureRowTeam}>
                              {formatTeamWithSourceLabel(match.home, match.homeSource, hasGroupStageStarted)}
                              {penaltyWinnerSide === "home" ? " *" : ""}
                            </span>
                            <span className={styles.fixtureRowCenter}>
                              <span className={styles.fixtureRowVs}>vs</span>
                              {matchStatus || hasSchedule ? (
                                <span className={styles.fixtureRowMeta}>
                                  {displayStatusLabel ? (
                                    <span
                                      className={`${styles.fixtureStatusBadge} ${
                                        displayStatusLabel === "Live"
                                          ? styles.fixtureStatusLive
                                          : displayStatusLabel === "HT"
                                            ? styles.fixtureStatusHalftime
                                            : displayStatusLabel === "Upcoming"
                                              ? styles.fixtureStatusUpcoming
                                              : styles.fixtureStatusEnded
                                      }`}
                                    >
                                      {displayStatusLabel}
                                    </span>
                                  ) : null}
                                  {matchStatus ? (
                                    <span className={styles.fixtureLiveScore}>
                                      {score.home}:{score.away}
                                    </span>
                                  ) : null}
                                  {matchStatus && clockText ? (
                                    <span className={styles.fixtureLiveClock}>{clockText}</span>
                                  ) : null}
                                  {matchStatus && phaseLabel ? (
                                    <span className={styles.fixtureLivePhase}>{phaseLabel}</span>
                                  ) : null}
                                  {!matchStatus && scheduleText ? (
                                    <span className={styles.fixtureScheduleMeta}>{scheduleText}</span>
                                  ) : null}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.fixtureRowTeamRight}>
                              {formatTeamWithSourceLabel(match.away, match.awaySource, hasGroupStageStarted)}
                              {penaltyWinnerSide === "away" ? " *" : ""}
                            </span>
                          </Link>
                          {isKnockoutMatch ? (
                            <button
                              className={styles.fixtureEditButton}
                              onClick={() => openEditKnockoutModal(match.matchIndex)}
                              type="button"
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.savedEmpty}>No fixtures in this section.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No fixtures available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 3: Tournament Table</h4>
        {tournamentTables.length ? (
          <div className={styles.manageFixturesStack}>
            {tournamentTables.map((groupTable) =>
              renderTournamentTableCard(groupTable, { keySuffix: groupTable.title })
            )}
            {renderTournamentTableCard(overallTournamentTable, {
              cardClassName: styles.overallTournamentCard,
              displayTitle: overallTournamentTable ? `${overallTournamentTable.title} (All Groups)` : "",
              keySuffix: "overall",
            })}
            {renderTournamentTableCard(winnersTournamentTable, { keySuffix: "winners" })}
            {renderTournamentTableCard(runnersUpTournamentTable, { keySuffix: "runners-up" })}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No group table is available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <div className={styles.squadModalActions}>
          <h4 className={styles.manageSectionTitle}>Section 4: Knock Out</h4>
          <button className={styles.primaryButton} onClick={openKnockoutModal} type="button">
            Create Matches
          </button>
        </div>
        <p className={styles.passwordText}>
          Create custom knockout matches like Quarter Final, Semi Final, or Final. Saved matches
          appear automatically inside Section 2: Match Fixtures.
        </p>
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 5 Tournament Summary</h4>
        <div className={styles.tournamentSummaryStack}>
          {tournamentSummaryTables.map((summaryTable) => (
            <div className={styles.manageFixtureCard} key={`${currentTournament.id}-${summaryTable.key}`}>
              <div className={styles.tournamentSummaryHeader}>
                <h5 className={styles.manageFixtureTitle}>{summaryTable.title}</h5>
                <button
                  aria-expanded={!hiddenSummaryTables[summaryTable.key]}
                  className={styles.secondaryButton}
                  onClick={() => toggleSummaryTable(summaryTable.key)}
                  type="button"
                >
                  {hiddenSummaryTables[summaryTable.key] ? "Show" : "Hide"}
                </button>
              </div>
              {!hiddenSummaryTables[summaryTable.key] && summaryTable.rows.length ? (
                <div className={styles.tournamentTableWrap}>
                  <table className={`${styles.tournamentTable} ${styles.tournamentSummaryTable}`}>
                    <thead>
                      {summaryTable.key === "fairPlay" ? (
                        <tr>
                          <th>Rank</th>
                          <th>Logo</th>
                          <th>Team</th>
                          <th>Points</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Player / Team</th>
                          <th>Team</th>
                          <th>{summaryTable.valueLabel}</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {summaryTable.rows.map((row, rowIndex) => (
                        <tr key={`${summaryTable.key}-${row.team}-${row.label}`}>
                          {summaryTable.key === "fairPlay" ? (
                            <>
                              <td>{rowIndex + 1}</td>
                              <td>
                                {teamLogoMap[row.label] ? (
                                  <img
                                    alt={`${row.label} logo`}
                                    className={styles.summaryTeamLogo}
                                    src={teamLogoMap[row.label]}
                                  />
                                ) : (
                                  <div className={styles.summaryTeamLogoFallback}>
                                    {String(row.label || "").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td>{row.label}</td>
                              <td>{formatSummaryValue(summaryTable.key, row)}</td>
                            </>
                          ) : (
                            <>
                              <td>{row.label}</td>
                              <td>{row.team || "-"}</td>
                              <td>{formatSummaryValue(summaryTable.key, row)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {!hiddenSummaryTables[summaryTable.key] && !summaryTable.rows.length ? (
                <div className={styles.savedEmpty}>No {summaryTable.title.toLowerCase()} data yet.</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.manageSectionCard}>
        <div className={styles.tournamentSummaryHeader}>
          <h4 className={styles.manageSectionTitle}>Overall Summary</h4>
          <button
            className={styles.primaryButton}
            disabled={isSavingOverallSummary}
            onClick={() => void handleSaveOverallSummary()}
            type="button"
          >
            {isSavingOverallSummary ? "Saving..." : "Save Overall Summary"}
          </button>
        </div>
        <div className={styles.overallSummaryGrid}>
          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Champion</h5>
              <p className={styles.resultMeta}>Choose a team or use the winner of a knockout match.</p>
            </div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("champion", {
                  mode: event.target.value,
                  team: "",
                  knockoutMatchIndex: "",
                })
              }
              value={overallSummaryForm.champion.mode}
            >
              <option value={OVERALL_MODE_MANUAL}>Team dropdown</option>
              <option value={OVERALL_MODE_AUTO}>Knockout match winner</option>
            </select>
            {overallSummaryForm.champion.mode === OVERALL_MODE_AUTO ? (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("champion", {
                    knockoutMatchIndex: event.target.value,
                  })
                }
                value={overallSummaryForm.champion.knockoutMatchIndex}
              >
                <option value="">Select knockout match</option>
                {knockoutMatchOptions.map((option) => (
                  <option key={`champion-knockout-${option.matchIndex}`} value={option.matchIndex}>
                    Winner of {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("champion", {
                    team: event.target.value,
                  })
                }
                value={overallSummaryForm.champion.team}
              >
                <option value="">Select team</option>
                {allTeamOptions.map((team) => (
                  <option key={`champion-team-${team}`} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("champion") || "Not selected"}
            </div>
          </div>

          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Runners Up</h5>
              <p className={styles.resultMeta}>Choose a team or use the loser of a knockout match.</p>
            </div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("runnerUp", {
                  mode: event.target.value,
                  team: "",
                  knockoutMatchIndex: "",
                })
              }
              value={overallSummaryForm.runnerUp.mode}
            >
              <option value={OVERALL_MODE_MANUAL}>Team dropdown</option>
              <option value={OVERALL_MODE_AUTO}>Knockout match loser</option>
            </select>
            {overallSummaryForm.runnerUp.mode === OVERALL_MODE_AUTO ? (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("runnerUp", {
                    knockoutMatchIndex: event.target.value,
                  })
                }
                value={overallSummaryForm.runnerUp.knockoutMatchIndex}
              >
                <option value="">Select knockout match</option>
                {knockoutMatchOptions.map((option) => (
                  <option key={`runner-up-knockout-${option.matchIndex}`} value={option.matchIndex}>
                    Loser of {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("runnerUp", {
                    team: event.target.value,
                  })
                }
                value={overallSummaryForm.runnerUp.team}
              >
                <option value="">Select team</option>
                {allTeamOptions.map((team) => (
                  <option key={`runner-up-team-${team}`} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("runnerUp") || "Not selected"}
            </div>
          </div>

          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Best Goalkeeper</h5>
              <p className={styles.resultMeta}>Choose a player or use the current clean-sheet leader.</p>
            </div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("bestGoalkeeper", {
                  mode: event.target.value,
                  playerKey: "",
                })
              }
              value={overallSummaryForm.bestGoalkeeper.mode}
            >
              <option value={OVERALL_MODE_MANUAL}>Player dropdown</option>
              <option value={OVERALL_MODE_AUTO}>Most clean sheet</option>
            </select>
            {overallSummaryForm.bestGoalkeeper.mode === OVERALL_MODE_AUTO ? (
              <div className={styles.overallSummaryAutoBox}>Most clean sheet</div>
            ) : (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("bestGoalkeeper", {
                    playerKey: event.target.value,
                  })
                }
                value={overallSummaryForm.bestGoalkeeper.playerKey}
              >
                <option value="">Select player</option>
                {allPlayerOptions.map((player) => (
                  <option key={`best-goalkeeper-${player.key}`} value={player.key}>
                    {player.label}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("bestGoalkeeper") || "Not selected"}
            </div>
          </div>

          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Top Scorer</h5>
              <p className={styles.resultMeta}>Choose a player or use the current goal leader.</p>
            </div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("topScorer", {
                  mode: event.target.value,
                  playerKey: "",
                })
              }
              value={overallSummaryForm.topScorer.mode}
            >
              <option value={OVERALL_MODE_AUTO}>Most goal scored</option>
              <option value={OVERALL_MODE_MANUAL}>Player dropdown</option>
            </select>
            {overallSummaryForm.topScorer.mode === OVERALL_MODE_AUTO ? (
              <div className={styles.overallSummaryAutoBox}>Most goal scored</div>
            ) : (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("topScorer", {
                    playerKey: event.target.value,
                  })
                }
                value={overallSummaryForm.topScorer.playerKey}
              >
                <option value="">Select player</option>
                {allPlayerOptions.map((player) => (
                  <option key={`top-scorer-${player.key}`} value={player.key}>
                    {player.label}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("topScorer") || "Not selected"}
            </div>
          </div>

          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Best Player</h5>
              <p className={styles.resultMeta}>Choose a player from saved team squads.</p>
            </div>
            <div className={styles.overallSummaryAutoBox}>Player dropdown</div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("bestPlayer", {
                  playerKey: event.target.value,
                })
              }
              value={overallSummaryForm.bestPlayer.playerKey}
            >
              <option value="">Select player</option>
              {allPlayerOptions.map((player) => (
                <option key={`best-player-${player.key}`} value={player.key}>
                  {player.label}
                </option>
              ))}
            </select>
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("bestPlayer") || "Not selected"}
            </div>
          </div>

          <div className={styles.overallSummaryRow}>
            <div>
              <h5 className={styles.manageFixtureTitle}>Fair Play</h5>
              <p className={styles.resultMeta}>
                Use the team with the highest fair-play score or select a team manually.
              </p>
            </div>
            <select
              className={styles.select}
              onChange={(event) =>
                updateOverallSummaryField("fairPlay", {
                  mode: event.target.value,
                  team: "",
                })
              }
              value={overallSummaryForm.fairPlay.mode}
            >
              <option value={OVERALL_MODE_AUTO}>Highest fair-play score</option>
              <option value={OVERALL_MODE_MANUAL}>Team dropdown</option>
            </select>
            {overallSummaryForm.fairPlay.mode === OVERALL_MODE_AUTO ? (
              <div className={styles.overallSummaryAutoBox}>Highest fair-play score</div>
            ) : (
              <select
                className={styles.select}
                onChange={(event) =>
                  updateOverallSummaryField("fairPlay", {
                    team: event.target.value,
                  })
                }
                value={overallSummaryForm.fairPlay.team}
              >
                <option value="">Select team</option>
                {allTeamOptions.map((team) => (
                  <option key={`fair-play-team-${team}`} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.overallSummaryPreview}>
              {getOverallSummaryPreview("fairPlay") || "Not selected"}
            </div>
          </div>
        </div>
        {!allPlayerOptions.length ? (
          <p className={styles.passwordText}>Save team squads first to populate player dropdowns.</p>
        ) : null}
        {overallSummaryMessage ? <p className={styles.status}>{overallSummaryMessage}</p> : null}
      </div>

      {isMasterAdmin ? (
        <div className={styles.manageSectionCard}>
          <h4 className={styles.manageSectionTitle}>Section 6: Backup Tournament Data</h4>
          <p className={styles.passwordText}>
            Download a full JSON backup of this tournament at any time — groups &amp; teams, squads,
            fixtures, live match events and scores, tournament tables, knockout matches, and the
            overall summary are all included. Keep this file safe as a restore point. Visible to the
            master admin only.
          </p>
          <button className={styles.primaryButton} onClick={handleDownloadBackup} type="button">
            Download Full Backup (JSON)
          </button>
        </div>
      ) : null}

      {pendingRestorePayload ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.passwordCard} role="dialog" aria-modal="true">
            <h3 className={styles.passwordTitle}>Restore Tournament From Backup?</h3>
            <p className={styles.passwordText}>
              This will replace <strong>{currentTournament.name}</strong>&apos;s current data with{" "}
              <strong>{pendingRestorePayload.name}</strong> from the uploaded file, including live
              match scores and events. This cannot be undone.
            </p>
            <div className={styles.passwordActions}>
              <button
                className={styles.confirmCancelButton}
                disabled={isRestoringBackup}
                onClick={cancelRestoreBackup}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.confirmOkButton}
                disabled={isRestoringBackup}
                onClick={() => void confirmRestoreBackup()}
                type="button"
              >
                {isRestoringBackup ? "Restoring..." : "Restore"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTeam ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.squadModalCard}>
            <div className={styles.squadModalHeader}>
              <div className={styles.squadModalTitleBlock}>
                {teamLogoMap[activeTeam] ? (
                  <img
                    alt={`${activeTeam} logo`}
                    className={styles.squadTeamLogo}
                    src={teamLogoMap[activeTeam]}
                  />
                ) : (
                  <div className={styles.manageTeamLogoFallback}>{activeTeam.slice(0, 1)}</div>
                )}
                <div>
                  <h3 className={styles.passwordTitle}>Enter full squad of {activeTeam}</h3>
                  <p className={styles.passwordText}>
                    Fill player details below. Player name is mandatory. You can add up to 30 rows.
                  </p>
                </div>
              </div>
              <button className={styles.secondaryButton} onClick={closeSquadModal} type="button">
                Close
              </button>
            </div>

            <div className={styles.squadTableWrap}>
              <table className={styles.squadTable}>
                <thead>
                  <tr>
                    <th>Player Name</th>
                    <th>Jersey Number</th>
                    <th>Position</th>
                    <th>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {squadRows.map((row, rowIndex) => {
                    const isDuplicateName = duplicateSquadNames.has(
                      String(row.name || "").trim().toLowerCase()
                    );

                    return (
                    <tr key={`${activeTeam}-row-${rowIndex + 1}`}>
                      <td>
                        <input
                          className={`${styles.input} ${
                            isDuplicateName ? styles.inputDuplicate : ""
                          }`}
                          onChange={(event) => updateSquadRow(rowIndex, "name", event.target.value)}
                          placeholder="Player name"
                          type="text"
                          value={row.name}
                        />
                        {isDuplicateName ? (
                          <p className={styles.duplicateHint}>
                            Duplicate player name. Names must be unique within the squad.
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          onChange={(event) =>
                            updateSquadRow(
                              rowIndex,
                              "jerseyNumber",
                              event.target.value.replace(/[^\d]/g, "")
                            )
                          }
                          placeholder="Optional"
                          type="text"
                          value={row.jerseyNumber}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          onChange={(event) => updateSquadRow(rowIndex, "position", event.target.value)}
                          value={row.position}
                        >
                          <option value="">Select position</option>
                          {PLAYER_POSITIONS.map((position) => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className={styles.squadPhotoCell}>
                          <input
                            accept="image/*"
                            className={styles.input}
                            disabled={isUploadingPlayerPhoto}
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                uploadPlayerPhoto(rowIndex, file);
                              }

                              event.target.value = "";
                            }}
                            type="file"
                          />
                          {row.photo ? (
                            <img
                              alt={row.name ? `${row.name} photo` : "Player photo"}
                              className={styles.squadPlayerPhoto}
                              src={getStoredImageUrl(row.photo)}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.squadModalActions}>
              <p className={styles.resultMeta}>Rows: {squadRows.length} / {MAX_SQUAD_ROWS}</p>
              <button
                className={styles.secondaryButton}
                disabled={squadRows.length >= MAX_SQUAD_ROWS}
                onClick={addSquadRow}
                type="button"
              >
                Add Row
              </button>
            </div>

            {squadStage === "leaders" ? (
              <div className={styles.squadLeadershipSection}>
                <h4 className={styles.manageSectionTitle}>Leadership</h4>
                <div className={styles.squadLeadershipGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="captain">
                      Captain
                    </label>
                    <select
                      className={styles.select}
                      id="captain"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          captain: event.target.value,
                          viceCaptain1:
                            event.target.value === current.viceCaptain1 ? "" : current.viceCaptain1,
                          viceCaptain2:
                            event.target.value === current.viceCaptain2 ? "" : current.viceCaptain2,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.captain}
                    >
                      <option value="">Select captain</option>
                      {getLeadershipOptions("captain").map((playerName) => (
                        <option key={`captain-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-1">
                      Vice Captain 1
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-1"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain1: event.target.value,
                          viceCaptain2:
                            event.target.value === current.viceCaptain2 ? "" : current.viceCaptain2,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.viceCaptain1}
                    >
                      <option value="">Select vice captain 1</option>
                      {getLeadershipOptions("viceCaptain1").map((playerName) => (
                        <option key={`vc1-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-2">
                      Vice Captain 2
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-2"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain2: event.target.value,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.viceCaptain2}
                    >
                      <option value="">Select vice captain 2</option>
                      {getLeadershipOptions("viceCaptain2").map((playerName) => (
                        <option key={`vc2-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-3">
                      Vice Captain 3
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-3"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain3: event.target.value,
                        }))
                      }
                      value={captainSelection.viceCaptain3}
                    >
                      <option value="">Select vice captain 3</option>
                      {getLeadershipOptions("viceCaptain3").map((playerName) => (
                        <option key={`vc3-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {squadMessage ? <p className={styles.status}>{squadMessage}</p> : null}
            {duplicateSquadNames.size > 0 ? (
              <p className={styles.duplicateHint}>
                Duplicate player names must be fixed before this squad can be saved.
              </p>
            ) : null}

            <div className={styles.passwordActions}>
              {squadStage === "players" ? (
                <button
                  className={styles.primaryButton}
                  disabled={
                    isSavingSquad ||
                    isUploadingPlayerPhoto ||
                    duplicateSquadNames.size > 0
                  }
                  onClick={handleSaveSquadPlayers}
                  type="button"
                >
                  {isSavingSquad ? "Saving..." : "Save Squad"}
                </button>
              ) : (
                <>
                  <button
                    className={styles.secondaryButton}
                    disabled={isSavingSquad}
                    onClick={() => setSquadStage("players")}
                    type="button"
                  >
                    Back to Squad
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={isSavingSquad || duplicateSquadNames.size > 0}
                    onClick={handleSaveLeadership}
                    type="button"
                  >
                    {isSavingSquad ? "Saving..." : "Save Leadership"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingConfirmAction ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.passwordCard} role="dialog" aria-modal="true">
            <h3 className={styles.passwordTitle}>{pendingConfirmAction.title}</h3>
            <p className={styles.passwordText}>{pendingConfirmAction.message}</p>
            <div className={styles.passwordActions}>
              <button
                className={styles.confirmCancelButton}
                onClick={() => closeAdminConfirmPrompt(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.confirmOkButton}
                onClick={() => closeAdminConfirmPrompt(true)}
                type="button"
              >
                {pendingConfirmAction.okLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isKnockoutModalOpen ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.squadModalCard}>
            <div className={styles.squadModalHeader}>
              <div>
                <h3 className={styles.passwordTitle}>
                  {editingKnockoutMatchIndex === null
                    ? "Create knockout match"
                    : "Edit knockout match"}
                </h3>
                <p className={styles.passwordText}>
                  {editingKnockoutMatchIndex === null
                    ? "Add a custom match name and choose manual teams, group table positions, or winners from saved knockout matches."
                    : "Correct the match name or selected teams for this custom knockout fixture."}
                </p>
              </div>
              <button className={styles.secondaryButton} onClick={closeKnockoutModal} type="button">
                Close
              </button>
            </div>

            <div className={styles.squadLeadershipSection}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="knockout-match-name">
                  Match name
                </label>
                <input
                  className={styles.input}
                  id="knockout-match-name"
                  onChange={(event) =>
                    setKnockoutMatchForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Semi Final"
                  type="text"
                  value={knockoutMatchForm.title}
                />
              </div>

              <div className={styles.squadLeadershipGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="knockout-home-source">
                    Team 1 source
                  </label>
                  <select
                    className={styles.select}
                    id="knockout-home-source"
                    onChange={(event) => updateKnockoutSource("home", event.target.value)}
                    value={knockoutMatchForm.homeSourceType}
                  >
                    <option value={KNOCKOUT_SOURCE_MANUAL}>Manual team</option>
                    <option value={KNOCKOUT_SOURCE_GROUP_POSITION}>Group table position</option>
                    <option value={KNOCKOUT_SOURCE_OVERALL_POSITION}>Overall table position</option>
                    <option value={KNOCKOUT_SOURCE_WINNERS_POSITION}>Best group winner position</option>
                    <option value={KNOCKOUT_SOURCE_RUNNERS_UP_POSITION}>Best group runner-up position</option>
                    <option value={KNOCKOUT_SOURCE_WINNER}>Winner of knockout match</option>
                    <option value={KNOCKOUT_SOURCE_LOSER}>Loser of knockout match</option>
                  </select>

                  <label className={styles.fieldLabel} htmlFor="knockout-home-team">
                    Team 1
                  </label>
                  {knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_GROUP_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutGroupPosition("home", event.target.value)}
                      value={knockoutMatchForm.homeGroupPosition}
                    >
                      <option value="">Select group position</option>
                      {getKnockoutGroupPositionOptions().map((option) => (
                        <option key={`knockout-home-position-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_OVERALL_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutOverallPosition("home", event.target.value)}
                      value={knockoutMatchForm.homeOverallPosition}
                    >
                      <option value="">Select overall table position</option>
                      {getKnockoutOverallPositionOptions().map((option) => (
                        <option key={`knockout-home-overall-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_WINNERS_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutWinnersPosition("home", event.target.value)}
                      value={knockoutMatchForm.homeWinnersPosition}
                    >
                      <option value="">Select best group winner position</option>
                      {getKnockoutWinnersPositionOptions().map((option) => (
                        <option key={`knockout-home-winners-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_RUNNERS_UP_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutRunnersUpPosition("home", event.target.value)}
                      value={knockoutMatchForm.homeRunnersUpPosition}
                    >
                      <option value="">Select best group runner-up position</option>
                      {getKnockoutRunnersUpPositionOptions().map((option) => (
                        <option key={`knockout-home-runners-up-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_WINNER ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutWinnerSource("home", event.target.value)}
                      value={knockoutMatchForm.homeWinnerMatchIndex}
                    >
                      <option value="">Select knockout winner</option>
                      {getSavedKnockoutMatchOptions().map((option) => (
                        <option key={`knockout-home-winner-${option.value}`} value={option.value}>
                          Winner of {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.homeSourceType === KNOCKOUT_SOURCE_LOSER ? (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) => updateKnockoutLoserSource("home", event.target.value)}
                      value={knockoutMatchForm.homeLoserMatchIndex}
                    >
                      <option value="">Select knockout loser</option>
                      {getSavedKnockoutMatchOptions().map((option) => (
                        <option key={`knockout-home-loser-${option.value}`} value={option.value}>
                          Loser of {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className={styles.select}
                      id="knockout-home-team"
                      onChange={(event) =>
                        setKnockoutMatchForm((current) => ({
                          ...current,
                          home: event.target.value,
                        }))
                      }
                      value={knockoutMatchForm.home}
                    >
                      <option value="">Select team</option>
                      {getKnockoutTeamOptions("home").map((group, groupIndex) => (
                        <optgroup key={`knockout-home-group-${groupIndex + 1}`} label={group.label}>
                          {group.teams.map((team) => (
                            <option key={`knockout-home-${team}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="knockout-away-source">
                    Team 2 source
                  </label>
                  <select
                    className={styles.select}
                    id="knockout-away-source"
                    onChange={(event) => updateKnockoutSource("away", event.target.value)}
                    value={knockoutMatchForm.awaySourceType}
                  >
                    <option value={KNOCKOUT_SOURCE_MANUAL}>Manual team</option>
                    <option value={KNOCKOUT_SOURCE_GROUP_POSITION}>Group table position</option>
                    <option value={KNOCKOUT_SOURCE_OVERALL_POSITION}>Overall table position</option>
                    <option value={KNOCKOUT_SOURCE_WINNERS_POSITION}>Best group winner position</option>
                    <option value={KNOCKOUT_SOURCE_RUNNERS_UP_POSITION}>Best group runner-up position</option>
                    <option value={KNOCKOUT_SOURCE_WINNER}>Winner of knockout match</option>
                    <option value={KNOCKOUT_SOURCE_LOSER}>Loser of knockout match</option>
                  </select>

                  <label className={styles.fieldLabel} htmlFor="knockout-away-team">
                    Team 2
                  </label>
                  {knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_GROUP_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutGroupPosition("away", event.target.value)}
                      value={knockoutMatchForm.awayGroupPosition}
                    >
                      <option value="">Select group position</option>
                      {getKnockoutGroupPositionOptions().map((option) => (
                        <option key={`knockout-away-position-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_OVERALL_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutOverallPosition("away", event.target.value)}
                      value={knockoutMatchForm.awayOverallPosition}
                    >
                      <option value="">Select overall table position</option>
                      {getKnockoutOverallPositionOptions().map((option) => (
                        <option key={`knockout-away-overall-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_WINNERS_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutWinnersPosition("away", event.target.value)}
                      value={knockoutMatchForm.awayWinnersPosition}
                    >
                      <option value="">Select best group winner position</option>
                      {getKnockoutWinnersPositionOptions().map((option) => (
                        <option key={`knockout-away-winners-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_RUNNERS_UP_POSITION ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutRunnersUpPosition("away", event.target.value)}
                      value={knockoutMatchForm.awayRunnersUpPosition}
                    >
                      <option value="">Select best group runner-up position</option>
                      {getKnockoutRunnersUpPositionOptions().map((option) => (
                        <option key={`knockout-away-runners-up-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_WINNER ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutWinnerSource("away", event.target.value)}
                      value={knockoutMatchForm.awayWinnerMatchIndex}
                    >
                      <option value="">Select knockout winner</option>
                      {getSavedKnockoutMatchOptions().map((option) => (
                        <option key={`knockout-away-winner-${option.value}`} value={option.value}>
                          Winner of {option.label}
                        </option>
                      ))}
                    </select>
                  ) : knockoutMatchForm.awaySourceType === KNOCKOUT_SOURCE_LOSER ? (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) => updateKnockoutLoserSource("away", event.target.value)}
                      value={knockoutMatchForm.awayLoserMatchIndex}
                    >
                      <option value="">Select knockout loser</option>
                      {getSavedKnockoutMatchOptions().map((option) => (
                        <option key={`knockout-away-loser-${option.value}`} value={option.value}>
                          Loser of {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className={styles.select}
                      id="knockout-away-team"
                      onChange={(event) =>
                        setKnockoutMatchForm((current) => ({
                          ...current,
                          away: event.target.value,
                        }))
                      }
                      value={knockoutMatchForm.away}
                    >
                      <option value="">Select team</option>
                      {getKnockoutTeamOptions("away").map((group, groupIndex) => (
                        <optgroup key={`knockout-away-group-${groupIndex + 1}`} label={group.label}>
                          {group.teams.map((team) => (
                            <option key={`knockout-away-${team}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <label className={styles.knockoutCheckbox}>
                <input
                  checked={knockoutMatchForm.includeInTable}
                  onChange={(event) =>
                    setKnockoutMatchForm((current) => ({
                      ...current,
                      includeInTable: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  Add this match result to Section 3: Tournament Table
                </span>
              </label>

              <div className={styles.knockoutTeamList}>
                {tournamentTables.map((groupTable, groupIndex) =>
                  renderKnockoutPositionPreview(groupTable, { keySuffix: `group-${groupIndex + 1}` })
                )}
                {renderKnockoutPositionPreview(overallTournamentTable, {
                  displayTitle: overallTournamentTable ? `${overallTournamentTable.title} (All Groups)` : "",
                  keySuffix: "overall",
                })}
                {renderKnockoutPositionPreview(winnersTournamentTable, { keySuffix: "winners" })}
                {renderKnockoutPositionPreview(runnersUpTournamentTable, { keySuffix: "runners-up" })}
              </div>

              {knockoutMessage ? <p className={styles.status}>{knockoutMessage}</p> : null}

              <div className={styles.squadModalActions}>
                <div />
                <button
                  className={styles.primaryButton}
                  disabled={isSavingKnockoutMatch}
                  onClick={handleSaveKnockoutMatch}
                  type="button"
                >
                  {isSavingKnockoutMatch
                    ? "Saving..."
                    : editingKnockoutMatchIndex === null
                      ? "Save Match"
                      : "Update Match"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
