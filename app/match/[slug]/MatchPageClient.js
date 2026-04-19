"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import SectionContainer from "../../../components/SectionContainer";
import { normalizeSavedTournament } from "../../../components/launchedTournamentUtils";
import { formatMatchClock, getMatchClockSeconds } from "../../../components/manageTournamentUtils";
import styles from "./page.module.css";

function getStaticLineup() {
  return [
    "Goalkeeper",
    "Right Back",
    "Center Back",
    "Center Back",
    "Left Back",
    "Midfielder",
    "Midfielder",
    "Midfielder",
    "Right Wing",
    "Striker",
    "Left Wing",
  ].map((player) => ({
    player,
    role: "",
  }));
}

function formatRole(role) {
  if (!role) {
    return "";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function buildStaticTimeline(events) {
  return Array.isArray(events)
    ? events.map((event) => ({
        id: event.id,
        displayTime: event.minute || "",
        text:
          event.type === "Substitution"
            ? `${event.team} substitution`
            : `${event.type} - ${event.team}${event.player ? ` (${event.player})` : ""}`,
        note:
          event.type === "Substitution"
            ? `Out: ${event.outPlayer || "Unknown"} | In: ${event.inPlayer || "Unknown"}`
            : "",
      }))
    : [];
}

function buildMatchData(match) {
  if (!match) {
    return null;
  }

  if (match.source === "static") {
    return {
      ...match,
      lineups: {
        home: match.lineups?.home?.length ? match.lineups.home : getStaticLineup(),
        away: match.lineups?.away?.length ? match.lineups.away : getStaticLineup(),
      },
      timelineEntries: buildStaticTimeline(match.timelineEntries),
    };
  }

  return match;
}

function buildLaunchedMatchData(tournament, fixture) {
  if (!tournament || !fixture) {
    return null;
  }

  return {
    source: "launched",
    slug: fixture.matchSlug,
    tournamentId: tournament.id,
    fixtureKey: fixture.fixtureKey,
    tournamentName: tournament.name,
    sectionTitle: fixture.sectionTitle || tournament.name,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeLogo: fixture.homeLogo || "",
    awayLogo: fixture.awayLogo || "",
    score: fixture.score || { home: 0, away: 0 },
    status: fixture.status,
    phaseLabel: fixture.phaseLabel || "",
    clockText: fixture.clockText || "",
    statusRecord: fixture.statusRecord || null,
    date: fixture.date || "TBD",
    time: fixture.time || "TBD",
    venue: "",
    lineups: fixture.lineup || { home: [], away: [] },
    timelineEntries: fixture.timelineEntries || [],
    telecast: fixture.telecast || null,
  };
}

function getLiveClock(match, timerNow) {
  if (!match?.statusRecord) {
    return match?.clockText || "";
  }

  return formatMatchClock(getMatchClockSeconds(match.statusRecord, timerNow));
}

function getGoalScorers(match, side) {
  const teamName = side === "home" ? match?.homeTeam : match?.awayTeam;
  const entries = Array.isArray(match?.timelineEntries) ? match.timelineEntries : [];

  return entries.filter(
    (entry) =>
      entry?.type === "event" &&
      (entry?.action === "goal" || entry?.action === "penalty-goal") &&
      String(entry?.teamName || "").trim() === String(teamName || "").trim()
  );
}

export default function MatchPageClient({ initialMatch }) {
  const [match, setMatch] = useState(() => buildMatchData(initialMatch));
  const [timerNow, setTimerNow] = useState(Date.now());

  useEffect(() => {
    setMatch(buildMatchData(initialMatch));
  }, [initialMatch]);

  useEffect(() => {
    if (match?.source !== "launched" || !match?.tournamentId || !match?.fixtureKey) {
      return undefined;
    }

    let isMounted = true;

    async function refreshMatch() {
      try {
        const response = await fetch(`/api/tournaments/${match.tournamentId}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.tournament?.launched || !isMounted) {
          return;
        }

        const tournament = normalizeSavedTournament(result.tournament);
        const fixture =
          tournament.fixtures.find((entry) => entry.fixtureKey === match.fixtureKey) || null;

        if (fixture) {
          setMatch(buildLaunchedMatchData(tournament, fixture));
        }
      } catch {
        return;
      }
    }

    refreshMatch();
    const intervalId = window.setInterval(refreshMatch, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [match?.fixtureKey, match?.source, match?.tournamentId]);

  useEffect(() => {
    if (match?.source !== "launched" || match?.statusRecord?.matchStatus !== "running") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [match?.source, match?.statusRecord?.matchStatus]);

  const liveClock = useMemo(() => getLiveClock(match, timerNow), [match, timerNow]);
  const homeGoalScorers = useMemo(() => getGoalScorers(match, "home"), [match]);
  const awayGoalScorers = useMemo(() => getGoalScorers(match, "away"), [match]);
  const telecastStatus = String(match?.telecast?.status || "stopped");
  const telecastOverlay = String(match?.telecast?.overlay || "none");
  const overlayPlayers =
    telecastOverlay === "home"
      ? match?.lineups?.home || []
      : telecastOverlay === "away"
        ? match?.lineups?.away || []
        : [];
  const overlayTeamName =
    telecastOverlay === "home"
      ? match?.homeTeam
      : telecastOverlay === "away"
        ? match?.awayTeam
        : "";
  const overlayTeamLogo =
    telecastOverlay === "home"
      ? match?.homeLogo
      : telecastOverlay === "away"
        ? match?.awayLogo
        : "";
  const hasTelecastSource = Boolean(String(match?.telecast?.url || "").trim());
  const showTelecastPlayer = hasTelecastSource && telecastStatus === "live";
  const showPausedTelecast = hasTelecastSource && telecastStatus === "paused";

  if (!match) {
    return (
      <main className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <section className={styles.notFoundCard}>
            <h1 className={styles.heading}>Match not found</h1>
            <p className={styles.notFoundText}>The shared match link is not available.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{match.source === "launched" ? "Live Match" : "Match Overview"}</p>
          <h1 className={styles.heading}>
            {match.homeTeam} vs {match.awayTeam}
          </h1>
          <p className={styles.heroMeta}>
            {match.tournamentName}
            {match.sectionTitle && match.sectionTitle !== match.tournamentName
              ? ` | ${match.sectionTitle}`
              : ""}
          </p>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.teamPanel}>
            {match.homeLogo ? (
              <img alt={`${match.homeTeam} logo`} className={styles.teamLogo} src={match.homeLogo} />
            ) : (
              <div className={styles.teamLogoFallback}>{match.homeTeam?.slice(0, 1) || "H"}</div>
            )}
            <p className={styles.teamLine}>{match.homeTeam}</p>
          </div>
          <div className={styles.scorePanel}>
            <div className={styles.statusRow}>
              <span className={styles.status}>{match.status}</span>
              {match.phaseLabel ? <span className={styles.phase}>{match.phaseLabel}</span> : null}
            </div>
            <p className={styles.score}>
              {match.score.home} - {match.score.away}
            </p>
            <p className={styles.liveClock}>{liveClock || "Not live"}</p>
          </div>
          <div className={styles.teamPanel}>
            {match.awayLogo ? (
              <img alt={`${match.awayTeam} logo`} className={styles.teamLogo} src={match.awayLogo} />
            ) : (
              <div className={styles.teamLogoFallback}>{match.awayTeam?.slice(0, 1) || "A"}</div>
            )}
            <p className={styles.teamLine}>{match.awayTeam}</p>
          </div>
        </section>

        <section className={styles.detailsCard}>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <p className={styles.label}>Date</p>
              <p className={styles.value}>{match.date}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Time</p>
              <p className={styles.value}>{match.time}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Tournament</p>
              <p className={styles.value}>{match.tournamentName}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Venue</p>
              <p className={styles.value}>{match.venue || "Live update feed"}</p>
            </div>
          </div>
        </section>

        {hasTelecastSource ? (
          <section className={styles.telecastCard}>
            <div className={styles.telecastHeader}>
              <div>
                <p className={styles.kicker}>Codactics TV</p>
                <h2 className={styles.sectionTitle}>Live Match Telecast</h2>
              </div>
              <span className={styles.telecastBadge}>
                {telecastStatus === "live"
                  ? "Live now"
                  : telecastStatus === "paused"
                    ? "Paused"
                    : "Offline"}
              </span>
            </div>

            {showTelecastPlayer ? (
              <div className={styles.telecastFrameWrap}>
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className={styles.telecastFrame}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={match.telecast.url}
                  title={`${match.homeTeam} vs ${match.awayTeam} live telecast`}
                />
              </div>
            ) : showPausedTelecast ? (
              <div className={styles.telecastState}>Live telecast is paused by the admin.</div>
            ) : (
              <div className={styles.telecastState}>Telecast is offline right now.</div>
            )}

            {match.telecast?.bottomScore ? (
              <div className={styles.scorerBoard}>
                <div className={styles.scorerColumn}>
                  <p className={styles.scorerTitle}>{match.homeTeam}</p>
                  {homeGoalScorers.length ? (
                    homeGoalScorers.map((entry) => (
                      <div className={styles.scorerRow} key={entry.id}>
                        <span>{entry.subjectLabel || match.homeTeam}</span>
                        <span>{entry.displayTime}</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyText}>No scorers yet</p>
                  )}
                </div>
                <div className={styles.scorerColumn}>
                  <p className={styles.scorerTitle}>{match.awayTeam}</p>
                  {awayGoalScorers.length ? (
                    awayGoalScorers.map((entry) => (
                      <div className={styles.scorerRow} key={entry.id}>
                        <span>{entry.subjectLabel || match.awayTeam}</span>
                        <span>{entry.displayTime}</span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyText}>No scorers yet</p>
                  )}
                </div>
              </div>
            ) : null}

            {telecastOverlay !== "none" && overlayPlayers.length ? (
              <div className={styles.overlayCard}>
                <div className={styles.overlayHeader}>
                  {overlayTeamLogo ? (
                    <img alt={`${overlayTeamName} logo`} className={styles.overlayLogo} src={overlayTeamLogo} />
                  ) : (
                    <div className={styles.overlayLogoFallback}>{overlayTeamName?.slice(0, 1) || "T"}</div>
                  )}
                  <div>
                    <p className={styles.kicker}>Starting Lineup</p>
                    <h3 className={styles.overlayTitle}>{overlayTeamName}</h3>
                  </div>
                </div>
                <div className={styles.overlayPlayers}>
                  {overlayPlayers.map((player) => (
                    <div className={styles.overlayPlayerRow} key={`${overlayTeamName}-${player.player}-${player.role}`}>
                      <span>{player.player}</span>
                      <span>{formatRole(player.role)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={styles.lineupCard}>
          <h2 className={styles.sectionTitle}>Team Line Up</h2>
          <div className={styles.lineupGrid}>
            <div className={styles.lineupColumn}>
              <div className={styles.lineupHeader}>
                <h3 className={styles.lineupSummary}>{match.homeTeam}</h3>
              </div>
              <div className={styles.lineupContent}>
                {(match.lineups.home || []).length ? (
                  <ol className={styles.lineupList}>
                    {match.lineups.home.map((player, index) => (
                      <li className={styles.lineupItem} key={`${match.homeTeam}-${player.player}-${index}`}>
                        <span>{player.player}</span>
                        {player.role ? <span className={styles.lineupRole}>{formatRole(player.role)}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.emptyText}>No lineup saved yet.</p>
                )}
              </div>
            </div>

            <div className={styles.lineupColumn}>
              <div className={styles.lineupHeader}>
                <h3 className={styles.lineupSummary}>{match.awayTeam}</h3>
              </div>
              <div className={styles.lineupContent}>
                {(match.lineups.away || []).length ? (
                  <ol className={styles.lineupList}>
                    {match.lineups.away.map((player, index) => (
                      <li className={styles.lineupItem} key={`${match.awayTeam}-${player.player}-${index}`}>
                        <span>{player.player}</span>
                        {player.role ? <span className={styles.lineupRole}>{formatRole(player.role)}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.emptyText}>No lineup saved yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <SectionContainer
          title="Match Events"
          description={
            match.source === "launched"
              ? "This shared page refreshes automatically to keep events in sync."
              : "Static event timeline for this match."
          }
        >
          <div className={styles.eventsList}>
            {match.timelineEntries.length ? (
              match.timelineEntries.map((entry) => (
                <article className={styles.eventCard} key={entry.id}>
                  <div className={styles.eventMinute}>{entry.displayTime || "--"}</div>
                  <div className={styles.eventContent}>
                    <p className={styles.eventType}>{entry.text}</p>
                    {entry.note ? <p className={styles.eventMeta}>{entry.note}</p> : null}
                  </div>
                </article>
              ))
            ) : (
              <article className={styles.eventCard}>
                <div className={styles.eventContent}>
                  <p className={styles.eventMeta}>No match events yet.</p>
                </div>
              </article>
            )}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
