"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../../../../../../components/Navbar";
import styles from "../../../../../page.module.css";
import wizardStyles from "../../../../../../../../components/CreateTournamentWizard.module.css";
import { getStoredImageUrl } from "../../../../../../../../components/launchedTournamentUtils";
import {
  buildTeamLogoMap,
  formatMatchClock,
  getFixtureByIndexes,
  getFixtureKey,
} from "../../../../../../../../components/manageTournamentUtils";

const MATCH_ACTIONS = [
  { value: "goal", label: "Goal", emoji: "⚽" },
  { value: "assist", label: "Assist", emoji: "🅰️" },
  { value: "red", label: "Red Card", emoji: "🟥" },
  { value: "yellow", label: "Yellow Card", emoji: "🟨" },
  { value: "sub-in", label: "Sub In", emoji: "🟢↑" },
  { value: "sub-out", label: "Sub Out", emoji: "🔴↓" },
  { value: "penalty", label: "Penalty", emoji: "🥅" },
  { value: "penalty-goal", label: "Penalty Goal", emoji: "🥅⚽" },
  { value: "penalty-missed", label: "Penalty Missed", emoji: "🥅❌" },
  { value: "free-kick", label: "Free Kick", emoji: "🎯" },
  { value: "corner", label: "Corner", emoji: "🚩" },
  { value: "other", label: "Other", emoji: "📝" },
];

function normalizeTelecastUrl(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const srcMatch = rawValue.match(/src\s*=\s*["']([^"']+)["']/i);
  const candidate = srcMatch?.[1] || rawValue.match(/https?:\/\/[^\s"'<>]+/i)?.[0] || rawValue;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

export default function AdminFixturePage({ params }) {
  const { id, sectionIndex, roundIndex, matchIndex } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("first");
  const [halfDurationMinutes, setHalfDurationMinutes] = useState(10);
  const [matchStatus, setMatchStatus] = useState("idle");
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [runningStartedAt, setRunningStartedAt] = useState(null);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [lineupRows, setLineupRows] = useState([]);
  const [isSavingLineup, setIsSavingLineup] = useState(false);
  const [lineupMessage, setLineupMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [telecastUrl, setTelecastUrl] = useState("");
  const [telecastStatus, setTelecastStatus] = useState("stopped");
  const [telecastOverlay, setTelecastOverlay] = useState("none");
  const [telecastBottomScore, setTelecastBottomScore] = useState(false);
  const [isSavingTelecast, setIsSavingTelecast] = useState(false);
  const [telecastMessage, setTelecastMessage] = useState("");
  const [draftMatchEvent, setDraftMatchEvent] = useState({
    subjectKey: "",
    action: "goal",
    note: "",
  });
  const [manualMatchEvent, setManualMatchEvent] = useState({
    subjectKey: "",
    action: "goal",
    note: "",
    clock: "",
  });
  const [savedMatchEvents, setSavedMatchEvents] = useState([]);
  const [editingMatchEventId, setEditingMatchEventId] = useState(null);
  const [matchStatusMessage, setMatchStatusMessage] = useState("");
  const [isResettingMatch, setIsResettingMatch] = useState(false);
  const [isSavingManualEvent, setIsSavingManualEvent] = useState(false);
  const [systemMoments, setSystemMoments] = useState({
    kickoff: null,
    halftime: null,
    fulltime: null,
  });
  const [isStatusHydrated, setIsStatusHydrated] = useState(false);
  const lastSavedStatusRef = useRef("");
  const hydratedFixtureKeyRef = useRef("");
  const tournamentRef = useRef(null);
  const statusSaveInFlightRef = useRef(false);
  const pendingSnapshotRef = useRef(null);

  function createEmptyLineupRow() {
    return {
      homePlayer: "",
      homeRole: "starting",
      awayPlayer: "",
      awayRole: "starting",
    };
  }

  useEffect(() => {
    async function loadFixturePage() {
      try {
        const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
        const sessionResult = await sessionResponse.json();

        if (!sessionResult.authenticated) {
          router.replace("/admin");
          return;
        }

        const tournamentResponse = await fetch(`/api/tournaments/${id}`, {
          cache: "no-store",
        });
        const tournamentResult = await tournamentResponse.json();

        if (!tournamentResponse.ok) {
          setErrorMessage(tournamentResult.message || "Tournament not found.");
          return;
        }

        setTournament(tournamentResult.tournament || null);
      } catch {
        setErrorMessage("Unable to load the selected fixture right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadFixturePage();
  }, [id, router]);

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const fixture = useMemo(() => {
    if (!tournament) {
      return null;
    }

    return getFixtureByIndexes(
      tournament,
      Number(sectionIndex),
      Number(roundIndex),
      Number(matchIndex)
    );
  }, [matchIndex, roundIndex, sectionIndex, tournament]);

  const teamLogoMap = useMemo(
    () => buildTeamLogoMap(tournament?.data || {}),
    [tournament]
  );
  const isTournamentLaunched = !!tournament?.launched;
  const fixtureKey = getFixtureKey(sectionIndex, roundIndex, matchIndex);
  const halfDurationSeconds = halfDurationMinutes * 60;
  const totalDurationSeconds = halfDurationSeconds * 2;
  const homeSquadPlayers = useMemo(() => {
    const players = tournament?.data?.teamSquads?.[fixture?.home]?.players;
    return Array.isArray(players) ? players : [];
  }, [fixture?.home, tournament]);
  const awaySquadPlayers = useMemo(() => {
    const players = tournament?.data?.teamSquads?.[fixture?.away]?.players;
    return Array.isArray(players) ? players : [];
  }, [fixture?.away, tournament]);
  function getAvailableLineupPlayers(teamSide, rowIndex) {
    const sourcePlayers = teamSide === "home" ? homeSquadPlayers : awaySquadPlayers;
    const selectedField = teamSide === "home" ? "homePlayer" : "awayPlayer";
    const currentValue = String(lineupRows[rowIndex]?.[selectedField] || "");
    const selectedElsewhere = new Set(
      lineupRows
        .filter((_, currentIndex) => currentIndex !== rowIndex)
        .map((row) => String(row?.[selectedField] || "").trim())
        .filter(Boolean)
    );

    return sourcePlayers.filter(
      (player) => player?.name === currentValue || !selectedElsewhere.has(String(player?.name || ""))
    );
  }
  const lineupPlayerOptions = useMemo(() => {
    const homeTeamOption = fixture?.home
      ? [
          {
            key: `team::${fixture.home}`,
            playerName: fixture.home,
            teamName: fixture.home,
            type: "team",
          },
        ]
      : [];
    const homeOptions = lineupRows
      .map((row) => row.homePlayer.trim())
      .filter(Boolean)
      .map((playerName) => ({
        key: `home::${playerName}`,
        playerName,
        teamName: fixture?.home || "",
        type: "player",
      }));
    const awayTeamOption = fixture?.away
      ? [
          {
            key: `team::${fixture.away}`,
            playerName: fixture.away,
            teamName: fixture.away,
            type: "team",
          },
        ]
      : [];
    const awayOptions = lineupRows
      .map((row) => row.awayPlayer.trim())
      .filter(Boolean)
      .map((playerName) => ({
        key: `away::${playerName}`,
        playerName,
        teamName: fixture?.away || "",
        type: "player",
      }));

    return {
      homeOptions: [...homeTeamOption, ...homeOptions],
      awayOptions: [...awayTeamOption, ...awayOptions],
      all: [...homeTeamOption, ...homeOptions, ...awayTeamOption, ...awayOptions],
    };
  }, [fixture?.away, fixture?.home, lineupRows]);

  useEffect(() => {
    if (!fixture || !tournament) {
      return;
    }

    if (hydratedFixtureKeyRef.current === fixtureKey) {
      return;
    }

    hydratedFixtureKeyRef.current = fixtureKey;

    const savedRows = tournament.data?.matchLineups?.[fixtureKey]?.rows;
    const normalizedRows = Array.isArray(savedRows)
      ? savedRows.map((row) => ({
          homePlayer: String(row?.homePlayer || ""),
          homeRole: String(row?.homeRole || "starting"),
          awayPlayer: String(row?.awayPlayer || ""),
          awayRole: String(row?.awayRole || "starting"),
        }))
      : [];

    while (normalizedRows.length < 5) {
      normalizedRows.push(createEmptyLineupRow());
    }

    setLineupRows(normalizedRows.slice(0, 30));
    setLineupMessage("");

    const savedStatus = tournament.data?.matchStatuses?.[fixtureKey];
    setSelectedHalf(savedStatus?.selectedHalf === "second" ? "second" : "first");
    setHalfDurationMinutes(
      Number.isFinite(savedStatus?.halfDurationMinutes) ? savedStatus.halfDurationMinutes : 10
    );
    setMatchStatus(String(savedStatus?.matchStatus || "idle"));
    setElapsedBeforePause(Number.isFinite(savedStatus?.elapsedBeforePause) ? savedStatus.elapsedBeforePause : 0);
    setRunningStartedAt(
      Number.isFinite(savedStatus?.runningStartedAt) ? savedStatus.runningStartedAt : null
    );
    setSavedMatchEvents(Array.isArray(savedStatus?.events) ? savedStatus.events : []);
    setSystemMoments({
      kickoff: Number.isFinite(savedStatus?.systemMoments?.kickoff)
        ? savedStatus.systemMoments.kickoff
        : null,
      halftime: Number.isFinite(savedStatus?.systemMoments?.halftime)
        ? savedStatus.systemMoments.halftime
        : null,
      fulltime: Number.isFinite(savedStatus?.systemMoments?.fulltime)
        ? savedStatus.systemMoments.fulltime
        : null,
    });
    setDraftMatchEvent({
      subjectKey: "",
      action: "goal",
      note: "",
    });
    setManualMatchEvent({
      subjectKey: "",
      action: "goal",
      note: "",
      clock: "",
    });
    const savedTelecast = tournament.data?.matchTelecasts?.[fixtureKey];
    setTelecastUrl(String(savedTelecast?.url || ""));
    setTelecastStatus(
      savedTelecast?.status === "live" || savedTelecast?.status === "paused"
        ? savedTelecast.status
        : "stopped"
    );
    setTelecastOverlay(
      savedTelecast?.overlay === "home" || savedTelecast?.overlay === "away"
        ? savedTelecast.overlay
        : "none"
    );
    setTelecastBottomScore(Boolean(savedTelecast?.bottomScore));
    setScheduledDate(String(fixture?.date || ""));
    setScheduledTime(String(fixture?.time || ""));
    setEditingMatchEventId(null);
    setMatchStatusMessage("");
    setScheduleMessage("");
    setTelecastMessage("");
    setTimerNow(Date.now());
    lastSavedStatusRef.current = getMatchStatusSnapshotKey({
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      selectedHalf: savedStatus?.selectedHalf === "second" ? "second" : "first",
      halfDurationMinutes: Number.isFinite(savedStatus?.halfDurationMinutes)
        ? savedStatus.halfDurationMinutes
        : 10,
      matchStatus: String(savedStatus?.matchStatus || "idle"),
      elapsedBeforePause: Number.isFinite(savedStatus?.elapsedBeforePause)
        ? savedStatus.elapsedBeforePause
        : 0,
      runningStartedAt: Number.isFinite(savedStatus?.runningStartedAt)
        ? savedStatus.runningStartedAt
        : null,
      clockSeconds: Number.isFinite(savedStatus?.clockSeconds) ? savedStatus.clockSeconds : 0,
      goalScore:
        Number.isFinite(savedStatus?.goalScore?.home) &&
        Number.isFinite(savedStatus?.goalScore?.away)
          ? savedStatus.goalScore
          : { home: 0, away: 0 },
      events: Array.isArray(savedStatus?.events) ? savedStatus.events : [],
      systemMoments: {
        kickoff: Number.isFinite(savedStatus?.systemMoments?.kickoff)
          ? savedStatus.systemMoments.kickoff
          : null,
        halftime: Number.isFinite(savedStatus?.systemMoments?.halftime)
          ? savedStatus.systemMoments.halftime
          : null,
        fulltime: Number.isFinite(savedStatus?.systemMoments?.fulltime)
          ? savedStatus.systemMoments.fulltime
          : null,
      },
      updatedAt: String(savedStatus?.updatedAt || ""),
    });
    setIsStatusHydrated(true);
  }, [fixture, fixtureKey, tournament]);

  useEffect(() => {
    if (matchStatus !== "running") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [matchStatus]);

  function getCurrentElapsedSeconds() {
    if (matchStatus !== "running" || runningStartedAt === null) {
      return elapsedBeforePause;
    }

    return elapsedBeforePause + Math.floor((timerNow - runningStartedAt) / 1000);
  }

  function getGoalScore(events = savedMatchEvents) {
    const score = { home: 0, away: 0 };

    events.forEach((event) => {
      if (event.action !== "goal" && event.action !== "penalty-goal") {
        return;
      }

      const teamName = String(event.teamName || getSubjectMeta(event.subjectKey)?.teamName || "");
      if (teamName === fixture?.home) {
        score.home += 1;
      }

      if (teamName === fixture?.away) {
        score.away += 1;
      }
    });

    return score;
  }

  function buildMatchStatusSnapshot(snapshotOverride = {}) {
    return {
      homeTeam: fixture?.home || "",
      awayTeam: fixture?.away || "",
      selectedHalf,
      halfDurationMinutes,
      matchStatus,
      elapsedBeforePause,
      runningStartedAt,
      clockSeconds: getCurrentElapsedSeconds(),
      goalScore: getGoalScore(),
      events: savedMatchEvents,
      systemMoments,
      updatedAt: new Date().toISOString(),
      ...snapshotOverride,
    };
  }

  function getMatchStatusSnapshotKey(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return "";
    }

    const { updatedAt: _updatedAt, ...stableSnapshot } = snapshot;
    return JSON.stringify(stableSnapshot);
  }

  async function persistMatchStatusSnapshot(snapshotOverride = {}) {
    const currentTournament = tournamentRef.current || tournament;

    if (!currentTournament || !fixture) {
      return;
    }

    const snapshot = buildMatchStatusSnapshot(snapshotOverride);
    const snapshotKey = getMatchStatusSnapshotKey(snapshot);

    if (lastSavedStatusRef.current === snapshotKey) {
      return;
    }

    if (statusSaveInFlightRef.current) {
      pendingSnapshotRef.current = snapshotOverride;
      return;
    }

    lastSavedStatusRef.current = snapshotKey;
    statusSaveInFlightRef.current = true;

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fixtureKey,
          snapshot,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the live match status.");
      }

      setTournament(result.tournament || currentTournament);
    } catch (error) {
      setMatchStatusMessage(error.message || "Unable to save the live match status.");
      lastSavedStatusRef.current = "";
    } finally {
      statusSaveInFlightRef.current = false;

      if (pendingSnapshotRef.current) {
        const nextSnapshotOverride = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        persistMatchStatusSnapshot(nextSnapshotOverride);
      }
    }
  }

  function handleKickoff() {
    if (!isTournamentLaunched) {
      return;
    }

    if (matchStatus === "running" || matchStatus === "ended") {
      return;
    }

    const now = Date.now();
    const nextSelectedHalf = matchStatus === "halftime" ? "second" : selectedHalf;
    const nextSystemMoments =
      matchStatus === "halftime"
        ? systemMoments
        : systemMoments.kickoff === null
          ? { ...systemMoments, kickoff: 1 }
          : systemMoments;

    if (matchStatus === "halftime") {
      setSelectedHalf("second");
    } else if (systemMoments.kickoff === null) {
      setSystemMoments((current) => ({ ...current, kickoff: 1 }));
    }

    setMatchStatus("running");
    setRunningStartedAt(now);
    setTimerNow(now);
    void persistMatchStatusSnapshot({
      selectedHalf: nextSelectedHalf,
      matchStatus: "running",
      runningStartedAt: now,
      elapsedBeforePause,
      systemMoments: nextSystemMoments,
      clockSeconds: elapsedBeforePause,
      goalScore: getGoalScore(),
    });
  }

  function handleHalfTime() {
    if (!isTournamentLaunched) {
      return;
    }

    if (matchStatus !== "running" || selectedHalf !== "first") {
      return;
    }

    setElapsedBeforePause(halfDurationSeconds);
    setRunningStartedAt(null);
    setMatchStatus("halftime");
    setSelectedHalf("first");
    const nextSystemMoments = { ...systemMoments, halftime: halfDurationSeconds };
    setSystemMoments(nextSystemMoments);
    void persistMatchStatusSnapshot({
      selectedHalf: "first",
      matchStatus: "halftime",
      elapsedBeforePause: halfDurationSeconds,
      runningStartedAt: null,
      systemMoments: nextSystemMoments,
      clockSeconds: halfDurationSeconds,
      goalScore: getGoalScore(),
    });
  }

  function handlePauseClock() {
    if (!isTournamentLaunched || matchStatus !== "running") {
      return;
    }

    const pausedAt = getCurrentElapsedSeconds();
    setElapsedBeforePause(pausedAt);
    setRunningStartedAt(null);
    setMatchStatus("paused");
    void persistMatchStatusSnapshot({
      matchStatus: "paused",
      elapsedBeforePause: pausedAt,
      runningStartedAt: null,
      clockSeconds: pausedAt,
      goalScore: getGoalScore(),
    });

    if (normalizeTelecastUrl(telecastUrl)) {
      void saveTelecast("paused", telecastOverlay, telecastBottomScore);
    }
  }

  function handleResumeClock() {
    if (!isTournamentLaunched || matchStatus !== "paused") {
      return;
    }

    const now = Date.now();
    setRunningStartedAt(now);
    setMatchStatus("running");
    setTimerNow(now);
    void persistMatchStatusSnapshot({
      matchStatus: "running",
      runningStartedAt: now,
      elapsedBeforePause,
      clockSeconds: elapsedBeforePause,
      goalScore: getGoalScore(),
    });

    if (normalizeTelecastUrl(telecastUrl)) {
      void saveTelecast("live", telecastOverlay, telecastBottomScore);
    }
  }

  function handleEndMatch() {
    if (!isTournamentLaunched) {
      return;
    }

    setElapsedBeforePause(totalDurationSeconds);
    setRunningStartedAt(null);
    setMatchStatus("ended");
    setSelectedHalf("second");
    const nextSystemMoments = { ...systemMoments, fulltime: totalDurationSeconds };
    setSystemMoments(nextSystemMoments);
    void persistMatchStatusSnapshot({
      selectedHalf: "second",
      matchStatus: "ended",
      elapsedBeforePause: totalDurationSeconds,
      runningStartedAt: null,
      systemMoments: nextSystemMoments,
      clockSeconds: totalDurationSeconds,
      goalScore: getGoalScore(),
    });
  }

  const displayedClock = useMemo(() => {
    if (matchStatus === "ended") {
      return formatMatchClock(totalDurationSeconds);
    }

    return formatMatchClock(getCurrentElapsedSeconds());
  }, [elapsedBeforePause, matchStatus, runningStartedAt, timerNow, totalDurationSeconds]);
  const displayScheduledDate =
    scheduledDate || fixture?.date || tournament?.data?.settings?.startDate || tournament?.startDate || "TBD";
  const displayScheduledTime = scheduledTime || fixture?.time || "TBD";

  async function saveFixtureSchedule() {
    if (!tournamentRef.current) {
      return;
    }

    setIsSavingSchedule(true);
    setScheduleMessage("");

    try {
      const currentTournament = tournamentRef.current;
      const { _id, ...safeTournament } = currentTournament || {};
      const nextTournament = {
        ...safeTournament,
        data: {
          ...(safeTournament.data || {}),
          fixtureSchedules: {
            ...(safeTournament.data?.fixtureSchedules || {}),
            [fixtureKey]: {
              date: scheduledDate,
              time: scheduledTime,
            },
          },
        },
      };

      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the fixture schedule.");
      }

      setTournament(result.tournament || nextTournament);
      setScheduleMessage("Fixture schedule saved.");
    } catch (error) {
      setScheduleMessage(error.message || "Unable to save the fixture schedule.");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function saveTelecast(
    nextStatus = telecastStatus,
    nextOverlay = telecastOverlay,
    nextBottomScore = telecastBottomScore
  ) {
    if (!tournamentRef.current) {
      return;
    }

    const normalizedUrl = normalizeTelecastUrl(telecastUrl);

    if (!normalizedUrl) {
      setTelecastMessage("Paste a valid live stream embed URL before saving telecast control.");
      return;
    }

    setIsSavingTelecast(true);
    setTelecastMessage("");

    try {
      const currentTournament = tournamentRef.current;
      const { _id, ...safeTournament } = currentTournament || {};
      const nextTournament = {
        ...safeTournament,
        data: {
          ...(safeTournament.data || {}),
          matchTelecasts: {
            ...(safeTournament.data?.matchTelecasts || {}),
            [fixtureKey]: {
              url: normalizedUrl,
              status: nextStatus,
              overlay: nextOverlay,
              bottomScore: nextBottomScore,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      };

      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the live telecast.");
      }

      setTournament(result.tournament || nextTournament);
      setTelecastUrl(normalizedUrl);
      setTelecastStatus(nextStatus);
      setTelecastOverlay(nextOverlay);
      setTelecastBottomScore(nextBottomScore);
      let nextTelecastMessage = "Live telecast updated.";

      if (nextOverlay === "home") {
        nextTelecastMessage = `${fixture?.home || "Home team"} lineup overlay shown on telecast.`;
      } else if (nextOverlay === "away") {
        nextTelecastMessage = `${fixture?.away || "Away team"} lineup overlay shown on telecast.`;
      } else if (telecastBottomScore !== nextBottomScore) {
        nextTelecastMessage = nextBottomScore
          ? "Bottom score overlay shown on telecast."
          : "Bottom score overlay cleared.";
      } else if (nextStatus === "live") {
        nextTelecastMessage = "Live telecast started.";
      } else if (nextStatus === "paused") {
        nextTelecastMessage = "Live telecast paused.";
      } else if (nextStatus === "stopped") {
        nextTelecastMessage = "Live telecast stopped.";
      }

      setTelecastMessage(nextTelecastMessage);
    } catch (error) {
      setTelecastMessage(error.message || "Unable to save the live telecast.");
    } finally {
      setIsSavingTelecast(false);
    }
  }

  useEffect(() => {
    if (!isStatusHydrated || !fixture) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      persistMatchStatusSnapshot();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    elapsedBeforePause,
    fixtureKey,
    halfDurationMinutes,
    isStatusHydrated,
    matchStatus,
    runningStartedAt,
    savedMatchEvents,
    selectedHalf,
    systemMoments,
  ]);

  function updateLineupRow(rowIndex, field, value) {
    setLineupRows((currentRows) =>
      currentRows.map((row, currentIndex) =>
        currentIndex === rowIndex ? { ...row, [field]: value } : row
      )
    );
  }

  function addLineupRow() {
    setLineupRows((currentRows) => {
      if (currentRows.length >= 30) {
        return currentRows;
      }

      return [...currentRows, createEmptyLineupRow()];
    });
  }

  async function saveLineup() {
    if (!tournament || !fixture) {
      return;
    }

    setIsSavingLineup(true);
    setLineupMessage("");

    try {
      const { _id, ...safeTournament } = tournament || {};
      const nextTournament = {
        ...safeTournament,
        data: {
          ...(safeTournament.data || {}),
          matchLineups: {
            ...(safeTournament.data?.matchLineups || {}),
            [fixtureKey]: {
              homeTeam: fixture.home,
              awayTeam: fixture.away,
              rows: lineupRows,
            },
          },
        },
      };

      const response = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the match lineup.");
      }

      setTournament(result.tournament || nextTournament);
      setLineupMessage("Match lineup saved.");
    } catch (error) {
      setLineupMessage(error.message || "Unable to save the match lineup.");
    } finally {
      setIsSavingLineup(false);
    }
  }

  function getClampedTime(seconds) {
    if (matchStatus === "ended") {
      return Math.min(seconds, totalDurationSeconds);
    }

    return seconds;
  }

  function parseManualClock(value) {
    const trimmedValue = String(value || "").trim();

    if (!trimmedValue) {
      return null;
    }

    const clockMatch = trimmedValue.match(/^(\d{1,3}):([0-5]\d)$/);

    if (!clockMatch) {
      return null;
    }

    const minutes = Number(clockMatch[1]);
    const seconds = Number(clockMatch[2]);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  function formatManualClock(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function getHalfForSeconds(seconds) {
    return seconds > halfDurationSeconds ? "second" : "first";
  }

  async function verifyAdminPassword(action) {
    const password = window.prompt(`Enter admin password to ${action}:`);

    if (password === null) {
      return false;
    }

    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      throw new Error("Admin password is required.");
    }

    const verifyResponse = await fetch("/api/admin/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: trimmedPassword,
        action,
      }),
    });
    const verifyResult = await verifyResponse.json();

    if (!verifyResponse.ok) {
      throw new Error(verifyResult.message || "Invalid admin password.");
    }

    return true;
  }

  function getSubjectMeta(subjectKey) {
    return lineupPlayerOptions.all.find((player) => player.key === subjectKey) || null;
  }

  function formatTimelineEvent(entry) {
    if (entry.type === "kickoff") {
      return "Kick Off";
    }

    if (entry.type === "halftime") {
      return "HALF --- TIME";
    }

    if (entry.type === "fulltime") {
      return "Full Time";
    }

    const actionMeta = MATCH_ACTIONS.find((action) => action.value === entry.action);
    const subjectMeta = getSubjectMeta(entry.subjectKey);
    const playerName = String(entry.subjectLabel || subjectMeta?.playerName || "");
    const teamName = String(entry.teamName || subjectMeta?.teamName || "");
    const subjectType = String(entry.subjectType || subjectMeta?.type || "");

    if (!actionMeta || (!teamName && !playerName)) {
      return "Match Event";
    }

    if (entry.action === "yellow") {
      const yellowCount = savedMatchEvents.filter(
        (event) =>
          event.action === "yellow" &&
          event.subjectKey === entry.subjectKey &&
          String(event.teamName || subjectMeta?.teamName || "") === teamName &&
          event.seconds <= entry.seconds
      ).length;

      if (yellowCount === 2) {
        return `${actionMeta.emoji}🟥 YELLOW + YELLOW RED CARD ${playerName} ${teamName}`;
      }
    }

    if (subjectType === "team") {
      return `${actionMeta.emoji} ${actionMeta.label.toUpperCase()} ${teamName}`;
    }

    return `${actionMeta.emoji} ${actionMeta.label.toUpperCase()} ${playerName} ${teamName}`;
  }

  const goalScore = useMemo(
    () => getGoalScore(savedMatchEvents),
    [fixture?.away, fixture?.home, savedMatchEvents, lineupPlayerOptions]
  );

  const timelineEntries = useMemo(() => {
    const systemEntries = [
      systemMoments.kickoff !== null
        ? { id: "kickoff", type: "kickoff", seconds: systemMoments.kickoff, order: 0 }
        : null,
      systemMoments.halftime !== null
        ? { id: "halftime", type: "halftime", seconds: systemMoments.halftime, order: 100000 }
        : null,
      systemMoments.fulltime !== null
        ? { id: "fulltime", type: "fulltime", seconds: systemMoments.fulltime, order: 200000 }
        : null,
    ].filter(Boolean);

    const eventEntries = savedMatchEvents.map((event, index) => ({
      ...event,
      type: "event",
      order: index + 10,
    }));

    return [...systemEntries, ...eventEntries]
      .map((entry, index) => {
        const rawSeconds = entry.seconds || 0;
        let nextSeconds = getClampedTime(rawSeconds);
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
          seconds: nextSeconds,
          order: nextOrder,
        };
      })
      .sort((left, right) => left.seconds - right.seconds || left.order - right.order);
  }, [halfDurationSeconds, matchStatus, savedMatchEvents, systemMoments, totalDurationSeconds]);

  function saveDraftMatchEvent() {
    if (!isTournamentLaunched) {
      setMatchStatusMessage("Launch the tournament before controlling live match events.");
      return;
    }

    if (editingMatchEventId) {
      setMatchStatusMessage("Use Manual Match Event to update the selected event.");
      return;
    }

    if (matchStatus !== "running") {
      setMatchStatusMessage("Start the match clock before adding match events.");
      return;
    }

    const subjectMeta = getSubjectMeta(draftMatchEvent.subjectKey);
    const existingEvent = editingMatchEventId
      ? savedMatchEvents.find((event) => event.id === editingMatchEventId) || null
      : null;

    if (!subjectMeta) {
      setMatchStatusMessage("Select a player or team from the saved match line up.");
      return;
    }

    const currentSeconds = getClampedTime(getCurrentElapsedSeconds());
    const nextEvent = {
      id: editingMatchEventId || `event-${Date.now()}`,
      subjectKey: draftMatchEvent.subjectKey,
      subjectLabel: subjectMeta.playerName,
      subjectType: subjectMeta.type,
      teamName: subjectMeta.teamName,
      action: draftMatchEvent.action,
      note: draftMatchEvent.note.trim(),
      seconds: existingEvent?.seconds ?? currentSeconds,
      half: existingEvent?.half || selectedHalf,
    };

    setSavedMatchEvents((currentEvents) => {
      if (!editingMatchEventId) {
        return [...currentEvents, nextEvent];
      }

      return currentEvents.map((event) =>
        event.id === editingMatchEventId ? nextEvent : event
      );
    });

    setDraftMatchEvent({
      subjectKey: "",
      action: "goal",
      note: "",
    });
    setEditingMatchEventId(null);
    setMatchStatusMessage("Match event saved.");
  }

  async function saveManualMatchEvent() {
    if (!isTournamentLaunched) {
      setMatchStatusMessage("Launch the tournament before controlling live match events.");
      return;
    }

    if (isSavingManualEvent) {
      return;
    }

    const subjectMeta = getSubjectMeta(manualMatchEvent.subjectKey);

    if (!subjectMeta) {
      setMatchStatusMessage("Select a player or team for the manual match event.");
      return;
    }

    const parsedSeconds = parseManualClock(manualMatchEvent.clock);

    if (parsedSeconds === null) {
      setMatchStatusMessage("Enter the manual match time as MM:SS, for example 10:00.");
      return;
    }

    const clampedSeconds = Math.max(0, getClampedTime(parsedSeconds));

    setIsSavingManualEvent(true);
    setMatchStatusMessage("");

    try {
      if (matchStatus === "ended") {
        const isVerified = await verifyAdminPassword(
          editingMatchEventId
            ? "edit a match event after full time"
            : "add a manual event after full time"
        );

        if (!isVerified) {
          return;
        }
      }

      const nextEvent = {
        id: editingMatchEventId || `event-${Date.now()}`,
        subjectKey: manualMatchEvent.subjectKey,
        subjectLabel: subjectMeta.playerName,
        subjectType: subjectMeta.type,
        teamName: subjectMeta.teamName,
        action: manualMatchEvent.action,
        note: manualMatchEvent.note.trim(),
        seconds: clampedSeconds,
        half: getHalfForSeconds(clampedSeconds),
      };

      setSavedMatchEvents((currentEvents) => {
        if (!editingMatchEventId) {
          return [...currentEvents, nextEvent];
        }

        return currentEvents.map((event) =>
          event.id === editingMatchEventId ? nextEvent : event
        );
      });
      setManualMatchEvent({
        subjectKey: "",
        action: "goal",
        note: "",
        clock: "",
      });
      setEditingMatchEventId(null);
      setMatchStatusMessage(
        editingMatchEventId ? "Match event updated from the manual section." : "Manual match event saved."
      );
    } catch (error) {
      setMatchStatusMessage(error.message || "Unable to save the manual match event.");
    } finally {
      setIsSavingManualEvent(false);
    }
  }

  async function handleResetMatch() {
    if (!isTournamentLaunched || !fixture || isResettingMatch) {
      return;
    }

    const confirmed = window.confirm(
      "Reset the full live match? This will clear the clock, score, and all saved match events."
    );

    if (!confirmed) {
      return;
    }

    setIsResettingMatch(true);
    setMatchStatusMessage("");

    try {
      const isVerified = await verifyAdminPassword("reset this match");

      if (!isVerified) {
        return;
      }

      const resetSystemMoments = {
        kickoff: null,
        halftime: null,
        fulltime: null,
      };
      const resetSnapshot = {
        homeTeam: fixture.home,
        awayTeam: fixture.away,
        selectedHalf: "first",
        halfDurationMinutes,
        matchStatus: "idle",
        elapsedBeforePause: 0,
        runningStartedAt: null,
        clockSeconds: 0,
        goalScore: { home: 0, away: 0 },
        events: [],
        systemMoments: resetSystemMoments,
        updatedAt: new Date().toISOString(),
      };

      setSelectedHalf("first");
      setMatchStatus("idle");
      setElapsedBeforePause(0);
      setRunningStartedAt(null);
      setTimerNow(Date.now());
      setSavedMatchEvents([]);
      setSystemMoments(resetSystemMoments);
      setDraftMatchEvent({
        subjectKey: "",
        action: "goal",
        note: "",
      });
      setManualMatchEvent({
        subjectKey: "",
        action: "goal",
        note: "",
        clock: "",
      });
      setEditingMatchEventId(null);
      lastSavedStatusRef.current = "";
      pendingSnapshotRef.current = null;

      await persistMatchStatusSnapshot(resetSnapshot);
      setMatchStatusMessage("Full match reset completed.");
    } catch (error) {
      setMatchStatusMessage(error.message || "Unable to reset the match.");
    } finally {
      setIsResettingMatch(false);
    }
  }

  function editMatchEvent(eventId) {
    const currentEvent = savedMatchEvents.find((event) => event.id === eventId);

    if (!currentEvent) {
      return;
    }

    setManualMatchEvent({
      subjectKey: currentEvent.subjectKey,
      action: currentEvent.action,
      note: currentEvent.note || "",
      clock: formatManualClock(currentEvent.seconds),
    });
    setDraftMatchEvent({
      subjectKey: "",
      action: "goal",
      note: "",
    });
    setEditingMatchEventId(eventId);
    setMatchStatusMessage("Event loaded into Manual Match Event. Update it there and save.");
  }

  function deleteMatchEvent(eventId) {
    setSavedMatchEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId)
    );

    if (editingMatchEventId === eventId) {
      setDraftMatchEvent({
        subjectKey: "",
        action: "goal",
        note: "",
      });
      setManualMatchEvent({
        subjectKey: "",
        action: "goal",
        note: "",
        clock: "",
      });
      setEditingMatchEventId(null);
    }

    setMatchStatusMessage("Match event deleted.");
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <Navbar />
        <section className={styles.wrapper}>
          <div className={styles.headerCard}>
            <p className={styles.eyebrow}>Live Fixture Control</p>
            <h1 className={styles.title}>Loading fixture</h1>
            <p className={styles.text}>Checking admin access and fetching the selected match.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.wrapper}>
        <div className={styles.headerCard}>
          <p className={styles.eyebrow}>Live Fixture Control</p>
          <h1 className={styles.title}>Match Control</h1>
          <p className={styles.text}>
            Scheduled: {displayScheduledDate} {displayScheduledTime !== "TBD" ? `at ${displayScheduledTime}` : "| Time TBD"}
          </p>
          <p className={styles.text}>
            <Link href={`/admin/dashboard/${id}`}>Back to Tournament Manage Page</Link>
          </p>
        </div>

        {errorMessage ? (
          <div className={styles.headerCard}>
            <p className={styles.text}>{errorMessage}</p>
          </div>
        ) : null}

        {fixture ? (
          <div className={wizardStyles.manageDetailSection}>
            <div className={wizardStyles.manageSectionCard}>
              <h4 className={wizardStyles.manageSectionTitle}>Match Schedule</h4>
              <div className={wizardStyles.squadLeadershipGrid}>
                <div className={wizardStyles.field}>
                  <label className={wizardStyles.fieldLabel} htmlFor="fixture-date">
                    Match date
                  </label>
                  <input
                    className={wizardStyles.input}
                    id="fixture-date"
                    onChange={(event) => setScheduledDate(event.target.value)}
                    type="date"
                    value={scheduledDate}
                  />
                </div>
                <div className={wizardStyles.field}>
                  <label className={wizardStyles.fieldLabel} htmlFor="fixture-time">
                    Match time
                  </label>
                  <input
                    className={wizardStyles.input}
                    id="fixture-time"
                    onChange={(event) => setScheduledTime(event.target.value)}
                    type="time"
                    value={scheduledTime}
                  />
                </div>
              </div>
              <div className={wizardStyles.lineupActions}>
                <div />
                <button
                  className={wizardStyles.primaryButton}
                  disabled={isSavingSchedule}
                  onClick={saveFixtureSchedule}
                  type="button"
                >
                  {isSavingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
              {scheduleMessage ? <p className={wizardStyles.status}>{scheduleMessage}</p> : null}
            </div>

            <div className={wizardStyles.manageSectionCard}>
              <h4 className={wizardStyles.manageSectionTitle}>Live Match Telecast</h4>
              <div className={wizardStyles.field}>
                <label className={wizardStyles.fieldLabel} htmlFor="telecast-url">
                  Admin URL entry
                </label>
                <input
                  className={wizardStyles.input}
                  id="telecast-url"
                  onChange={(event) => setTelecastUrl(event.target.value)}
                  placeholder="https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID&autoplay=1"
                  type="text"
                  value={telecastUrl}
                />
              </div>
              <div className={wizardStyles.lineupActions}>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastStatus === "live" ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast("live")}
                  type="button"
                >
                  Start
                </button>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastStatus === "stopped" ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast("stopped")}
                  type="button"
                >
                  Stop
                </button>
              </div>
              <div className={wizardStyles.lineupActions}>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastOverlay === "home" ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast(telecastStatus, "home")}
                  type="button"
                >
                  {fixture.home} Lineup
                </button>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastOverlay === "away" ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast(telecastStatus, "away")}
                  type="button"
                >
                  {fixture.away} Lineup
                </button>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastOverlay === "none" ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast(telecastStatus, "none")}
                  type="button"
                >
                  Clear Overlay
                </button>
              </div>
              <div className={wizardStyles.lineupActions}>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    telecastBottomScore ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast(telecastStatus, telecastOverlay, true)}
                  type="button"
                >
                  Bottom Score
                </button>
                <button
                  className={`${wizardStyles.secondaryButton} ${
                    !telecastBottomScore ? wizardStyles.telecastActiveButton : ""
                  }`}
                  disabled={isSavingTelecast}
                  onClick={() => void saveTelecast(telecastStatus, telecastOverlay, false)}
                  type="button"
                >
                  Clear Bottom Score
                </button>
              </div>
              {telecastMessage ? <p className={wizardStyles.status}>{telecastMessage}</p> : null}
            </div>

            <div className={wizardStyles.manageSectionCard}>
              <h4 className={wizardStyles.manageSectionTitle}>Section 1: Match line up</h4>
              <div className={wizardStyles.lineupHeader}>
                <div className={wizardStyles.lineupTeamTitle}>{fixture.home}</div>
                <div className={wizardStyles.lineupTeamTitle}>{fixture.away}</div>
              </div>
              <div className={wizardStyles.lineupTable}>
                <div className={wizardStyles.lineupTableHead}>Player Name</div>
                <div className={wizardStyles.lineupTableHead}>Role</div>
                <div className={wizardStyles.lineupTableHead}>Player Name</div>
                <div className={wizardStyles.lineupTableHead}>Role</div>
                {lineupRows.map((row, rowIndex) => (
                  <div className={wizardStyles.lineupRow} key={`lineup-${rowIndex + 1}`}>
                    <select
                      className={wizardStyles.select}
                      onChange={(event) => updateLineupRow(rowIndex, "homePlayer", event.target.value)}
                      value={row.homePlayer}
                    >
                      <option value="">Select player</option>
                      {getAvailableLineupPlayers("home", rowIndex).map((player) => (
                        <option key={`home-${player.name}`} value={player.name}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={wizardStyles.select}
                      onChange={(event) => updateLineupRow(rowIndex, "homeRole", event.target.value)}
                      value={row.homeRole}
                    >
                      <option value="starting">Starting</option>
                      <option value="sub">Sub</option>
                      <option value="reserve">Reserve</option>
                    </select>
                    <select
                      className={wizardStyles.select}
                      onChange={(event) => updateLineupRow(rowIndex, "awayPlayer", event.target.value)}
                      value={row.awayPlayer}
                    >
                      <option value="">Select player</option>
                      {getAvailableLineupPlayers("away", rowIndex).map((player) => (
                        <option key={`away-${player.name}`} value={player.name}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={wizardStyles.select}
                      onChange={(event) => updateLineupRow(rowIndex, "awayRole", event.target.value)}
                      value={row.awayRole}
                    >
                      <option value="starting">Starting</option>
                      <option value="sub">Sub</option>
                      <option value="reserve">Reserve</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className={wizardStyles.lineupActions}>
                <button
                  className={wizardStyles.secondaryButton}
                  disabled={lineupRows.length >= 30}
                  onClick={addLineupRow}
                  type="button"
                >
                  Add More
                </button>
                <button
                  className={wizardStyles.primaryButton}
                  disabled={isSavingLineup}
                  onClick={saveLineup}
                  type="button"
                >
                  {isSavingLineup ? "Saving..." : "Save Line Up"}
                </button>
              </div>
              {lineupMessage ? <p className={wizardStyles.status}>{lineupMessage}</p> : null}
            </div>

            <div className={wizardStyles.manageSectionCard}>
              <div className={wizardStyles.manageSectionHeader}>
                <h4 className={wizardStyles.manageSectionTitle}>Section 2: Live Scoreboard</h4>
                <button
                  className={wizardStyles.secondaryButton}
                  disabled={!isTournamentLaunched || isResettingMatch}
                  onClick={handleResetMatch}
                  type="button"
                >
                  {isResettingMatch ? "Resetting..." : "Reset Match"}
                </button>
              </div>
              {!isTournamentLaunched ? (
                <p className={wizardStyles.notice}>
                  Launch this tournament first. Live scoreboard controls stay locked until the
                  tournament is launched.
                </p>
              ) : null}
              <div className={wizardStyles.field}>
                <label className={wizardStyles.fieldLabel} htmlFor="half-duration">
                  Duration of each half
                </label>
                <input
                  className={wizardStyles.input}
                  id="half-duration"
                  max="90"
                  min="0"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    const boundedValue = Number.isFinite(nextValue)
                      ? Math.min(90, Math.max(0, nextValue))
                      : 0;
                    setHalfDurationMinutes(boundedValue);
                  }}
                  type="number"
                  value={halfDurationMinutes}
                />
              </div>
              <div className={wizardStyles.liveControlBar}>
                <button
                  className={wizardStyles.launchButton}
                  disabled={
                    !isTournamentLaunched || matchStatus === "running" || matchStatus === "ended"
                  }
                  onClick={handleKickoff}
                  type="button"
                >
                  Kick off
                </button>
                <button
                  className={wizardStyles.savedActionButton}
                  disabled={
                    !isTournamentLaunched ||
                    matchStatus !== "running" ||
                    selectedHalf !== "first"
                  }
                  onClick={handleHalfTime}
                  type="button"
                >
                  HT
                </button>
                <button
                  className={wizardStyles.pauseButton}
                  disabled={!isTournamentLaunched}
                  onClick={handleEndMatch}
                  type="button"
                >
                  End
                </button>
              </div>
              <div className={wizardStyles.liveScoreboardCard}>
                <div className={wizardStyles.liveTeamBlock}>
                  {teamLogoMap[fixture.home] ? (
                    <img
                      alt={`${fixture.home} logo`}
                      className={wizardStyles.liveScoreTeamLogo}
                      src={getStoredImageUrl(teamLogoMap[fixture.home])}
                    />
                  ) : (
                    <div className={wizardStyles.liveScoreTeamLogoFallback}>
                      {fixture.home.slice(0, 1)}
                    </div>
                  )}
                  <span className={wizardStyles.liveScoreTeamName}>{fixture.home}</span>
                </div>

                <div className={wizardStyles.liveScoreCenterBlock}>
                  <div className={wizardStyles.liveClockWithAction}>
                    <div className={wizardStyles.liveScoreValue}>{displayedClock}</div>
                    <button
                      className={wizardStyles.savedActionButton}
                      disabled={
                        !isTournamentLaunched ||
                        (matchStatus !== "running" && matchStatus !== "paused")
                      }
                      onClick={matchStatus === "paused" ? handleResumeClock : handlePauseClock}
                      type="button"
                    >
                      {matchStatus === "paused" ? "Resume Clock" : "Pause Clock"}
                    </button>
                  </div>
                  <div className={wizardStyles.liveGoalScoreValue}>
                    {goalScore.home}:{goalScore.away}
                  </div>
                  <div className={wizardStyles.halfSlider} role="tablist" aria-label="Match half">
                    <button
                      aria-selected={selectedHalf === "first"}
                      className={`${wizardStyles.halfSliderButton} ${
                        selectedHalf === "first" ? wizardStyles.activeHalfSliderButton : ""
                      }`}
                      type="button"
                    >
                      1st Half
                    </button>
                    <button
                      aria-selected={selectedHalf === "second"}
                      className={`${wizardStyles.halfSliderButton} ${
                        selectedHalf === "second" ? wizardStyles.activeHalfSliderButton : ""
                      }`}
                      type="button"
                    >
                      2nd Half
                    </button>
                  </div>
                </div>

                <div className={wizardStyles.liveTeamBlock}>
                  <span className={wizardStyles.liveScoreTeamName}>{fixture.away}</span>
                  {teamLogoMap[fixture.away] ? (
                    <img
                      alt={`${fixture.away} logo`}
                      className={wizardStyles.liveScoreTeamLogo}
                      src={getStoredImageUrl(teamLogoMap[fixture.away])}
                    />
                  ) : (
                    <div className={wizardStyles.liveScoreTeamLogoFallback}>
                      {fixture.away.slice(0, 1)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={wizardStyles.manageSectionCard}>
              <h4 className={wizardStyles.manageSectionTitle}>Section 3: Match Status</h4>
              {!isTournamentLaunched ? (
                <p className={wizardStyles.notice}>
                  Match status controls unlock only after the tournament is launched.
                </p>
              ) : null}
              <div className={wizardStyles.matchStatusEntryGrid}>
                <div className={wizardStyles.matchStatusHead}>Player / Team</div>
                <div className={wizardStyles.matchStatusHead}>Action</div>
                <div className={wizardStyles.matchStatusHead}>Note</div>
                <div className={wizardStyles.matchStatusHead}>Add</div>

                <select
                  className={wizardStyles.select}
                  disabled={!isTournamentLaunched || matchStatus !== "running"}
                  onChange={(event) =>
                    setDraftMatchEvent((current) => ({
                      ...current,
                      subjectKey: event.target.value,
                    }))
                  }
                  value={draftMatchEvent.subjectKey}
                >
                  <option value="">Select player or team</option>
                  <optgroup label={fixture.home}>
                    {lineupPlayerOptions.homeOptions.map((player) => (
                      <option key={player.key} value={player.key}>
                        {player.type === "team" ? `${player.teamName} (Team)` : player.playerName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={fixture.away}>
                    {lineupPlayerOptions.awayOptions.map((player) => (
                      <option key={player.key} value={player.key}>
                        {player.type === "team" ? `${player.teamName} (Team)` : player.playerName}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <select
                  className={wizardStyles.select}
                  disabled={!isTournamentLaunched || matchStatus !== "running"}
                  onChange={(event) =>
                    setDraftMatchEvent((current) => ({
                      ...current,
                      action: event.target.value,
                    }))
                  }
                  value={draftMatchEvent.action}
                >
                  {MATCH_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
                <input
                  className={wizardStyles.input}
                  disabled={!isTournamentLaunched || matchStatus !== "running"}
                  onChange={(event) =>
                    setDraftMatchEvent((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Small comment"
                  type="text"
                  value={draftMatchEvent.note}
                />
                <button
                  className={wizardStyles.eventActionButton}
                  disabled={!isTournamentLaunched || matchStatus !== "running"}
                  onClick={saveDraftMatchEvent}
                  type="button"
                >
                  ✓
                </button>
              </div>

              {matchStatusMessage ? <p className={wizardStyles.status}>{matchStatusMessage}</p> : null}
              <div className={wizardStyles.manualEventCard}>
                <h5 className={wizardStyles.manualEventTitle}>Manual Match Event</h5>
                <div className={wizardStyles.matchStatusManualGrid}>
                  <div className={wizardStyles.matchStatusHead}>Player / Team</div>
                  <div className={wizardStyles.matchStatusHead}>Action</div>
                  <div className={wizardStyles.matchStatusHead}>Note</div>
                  <div className={wizardStyles.matchStatusHead}>Timing</div>
                  <div className={wizardStyles.matchStatusHead}>Add</div>

                  <select
                    className={wizardStyles.select}
                    disabled={!isTournamentLaunched || isSavingManualEvent}
                    onChange={(event) =>
                      setManualMatchEvent((current) => ({
                        ...current,
                        subjectKey: event.target.value,
                      }))
                    }
                    value={manualMatchEvent.subjectKey}
                  >
                    <option value="">Select player or team</option>
                    <optgroup label={fixture.home}>
                      {lineupPlayerOptions.homeOptions.map((player) => (
                        <option key={`manual-${player.key}`} value={player.key}>
                          {player.type === "team" ? `${player.teamName} (Team)` : player.playerName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={fixture.away}>
                      {lineupPlayerOptions.awayOptions.map((player) => (
                        <option key={`manual-${player.key}`} value={player.key}>
                          {player.type === "team" ? `${player.teamName} (Team)` : player.playerName}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <select
                    className={wizardStyles.select}
                    disabled={!isTournamentLaunched || isSavingManualEvent}
                    onChange={(event) =>
                      setManualMatchEvent((current) => ({
                        ...current,
                        action: event.target.value,
                      }))
                    }
                    value={manualMatchEvent.action}
                  >
                    {MATCH_ACTIONS.map((action) => (
                      <option key={`manual-action-${action.value}`} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={wizardStyles.input}
                    disabled={!isTournamentLaunched || isSavingManualEvent}
                    onChange={(event) =>
                      setManualMatchEvent((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Small comment"
                    type="text"
                    value={manualMatchEvent.note}
                  />
                  <input
                    className={wizardStyles.input}
                    disabled={!isTournamentLaunched || isSavingManualEvent}
                    onChange={(event) =>
                      setManualMatchEvent((current) => ({
                        ...current,
                        clock: event.target.value,
                      }))
                    }
                    placeholder="10:00"
                    type="text"
                    value={manualMatchEvent.clock}
                  />
                  <button
                    className={wizardStyles.eventActionButton}
                    disabled={!isTournamentLaunched || isSavingManualEvent}
                    onClick={saveManualMatchEvent}
                    type="button"
                  >
                    {isSavingManualEvent ? "..." : editingMatchEventId ? "↻" : "✓"}
                  </button>
                </div>
                <p className={wizardStyles.status}>
                  {editingMatchEventId
                    ? "This event is in edit mode here. After full time, saving the update requires the admin password."
                    : "Use this row to add a past match moment at any time. After full time, every manual entry requires the admin password."}
                </p>
              </div>

              <div className={wizardStyles.matchTimeline}>
                {timelineEntries.map((entry) => (
                  <div className={wizardStyles.matchTimelineRow} key={entry.id}>
                    <div className={wizardStyles.matchTimelineText}>
                      <span className={wizardStyles.matchTimelineTime}>
                        {formatMatchClock(entry.seconds)}
                      </span>
                      <span>{formatTimelineEvent(entry)}</span>
                    </div>
                    {entry.note ? (
                      <div className={wizardStyles.matchTimelineNote}>{entry.note}</div>
                    ) : null}
                    {entry.type === "event" ? (
                      <div className={wizardStyles.matchTimelineActions}>
                        <button
                          className={wizardStyles.eventIconButton}
                          disabled={!isTournamentLaunched}
                          onClick={() => editMatchEvent(entry.id)}
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          className={wizardStyles.eventIconButton}
                          disabled={!isTournamentLaunched}
                          onClick={() => deleteMatchEvent(entry.id)}
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !errorMessage ? (
          <div className={styles.headerCard}>
            <p className={styles.text}>Fixture not found.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
