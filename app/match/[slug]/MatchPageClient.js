"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import codacticsGif from "../../../logo/codactics.gif";
import Navbar from "../../../components/Navbar";
import SectionContainer from "../../../components/SectionContainer";
import { normalizeSavedTournament } from "../../../components/launchedTournamentUtils";
import { formatMatchClock, getMatchClockSeconds } from "../../../components/manageTournamentUtils";
import styles from "./page.module.css";

const LAUNCHED_MATCH_REFRESH_MS = 2000;

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

  return entries
    .filter(
      (entry) =>
        entry?.type === "event" &&
        (entry?.action === "goal" || entry?.action === "penalty-goal") &&
        String(entry?.teamName || "").trim() === String(teamName || "").trim()
    )
    .map((entry) => ({
      id: entry.id,
      player: String(entry.subjectLabel || "").trim() || String(teamName || ""),
      time: String(entry.displayTime || "").trim(),
    }));
}

function getTelecastStatusLabel(status) {
  if (status === "live") {
    return "Live now";
  }

  if (status === "paused") {
    return "Paused";
  }

  return "Offline";
}

function getMatchDisplayStatus(match) {
  const matchStatus = String(match?.statusRecord?.matchStatus || "");

  if (matchStatus === "running" || matchStatus === "paused") {
    return "Live";
  }

  if (matchStatus === "halftime") {
    return "HT";
  }

  if (matchStatus === "ended") {
    return "End";
  }

  return String(match?.status || "Upcoming");
}

export default function MatchPageClient({ initialMatch }) {
  const [match, setMatch] = useState(() => buildMatchData(initialMatch));
  const [timerNow, setTimerNow] = useState(Date.now());
  const telecastFrameWrapRef = useRef(null);

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
    const intervalId = window.setInterval(refreshMatch, LAUNCHED_MATCH_REFRESH_MS);

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
  const displayStatus = useMemo(() => getMatchDisplayStatus(match), [match]);
  const homeGoalScorers = useMemo(() => getGoalScorers(match, "home"), [match]);
  const awayGoalScorers = useMemo(() => getGoalScorers(match, "away"), [match]);
  const timelineEntries = Array.isArray(match?.timelineEntries) ? match.timelineEntries : [];
  const mvpEntries = timelineEntries.filter((entry) => entry?.action === "mvp");
  const matchEventEntries = timelineEntries.filter((entry) => entry?.action !== "mvp");
  const homeScore = String(match?.score?.home ?? 0);
  const awayScore = String(match?.score?.away ?? 0);
  const penaltyScore = match?.penaltyScore || { home: 0, away: 0 };
  const penaltyWinnerSide = String(match?.penaltyWinnerSide || "");
  const telecastUrl = String(match?.telecast?.url || "").trim();
  const telecastStatus = String(match?.telecast?.status || "stopped");
  const telecastOverlay = String(match?.telecast?.overlay || "none");
  const showBottomScore = Boolean(match?.telecast?.bottomScore);
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
  const hasTelecastSource = Boolean(telecastUrl);
  const showTelecastPlayer = hasTelecastSource && telecastStatus === "live";
  const showPausedTelecast = hasTelecastSource && telecastStatus === "paused";

  async function handleTelecastFullscreen() {
    const telecastFrameWrap = telecastFrameWrapRef.current;

    try {
      if (telecastFrameWrap && typeof telecastFrameWrap.requestFullscreen === "function") {
        await telecastFrameWrap.requestFullscreen();
        await screen.orientation?.lock?.("landscape");
        return;
      }
    } catch {
      // Fall back to opening the hosted stream directly when the browser blocks fullscreen.
    }

    if (telecastUrl) {
      window.open(telecastUrl, "_blank", "noopener,noreferrer");
    }
  }

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
            <p className={styles.teamLine}>{match.homeTeam}{penaltyWinnerSide === "home" ? " *" : ""}</p>
          </div>
          <div className={styles.scorePanel}>
            <div className={styles.statusRow}>
              <span className={styles.status}>{displayStatus}</span>
              {match.phaseLabel ? <span className={styles.phase}>{match.phaseLabel}</span> : null}
            </div>
            <p className={styles.score}>
              {match.score.home} - {match.score.away}
            </p>
            {penaltyWinnerSide ? (
              <p className={styles.liveClock}>({penaltyScore.home}:{penaltyScore.away})</p>
            ) : null}
            <p className={styles.liveClock}>{liveClock || "Not live"}</p>
          </div>
          <div className={styles.teamPanel}>
            {match.awayLogo ? (
              <img alt={`${match.awayTeam} logo`} className={styles.teamLogo} src={match.awayLogo} />
            ) : (
              <div className={styles.teamLogoFallback}>{match.awayTeam?.slice(0, 1) || "A"}</div>
            )}
            <p className={styles.teamLine}>{match.awayTeam}{penaltyWinnerSide === "away" ? " *" : ""}</p>
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
              <div className={styles.telecastHeaderActions}>
                <span className={styles.telecastBadge}>
                  {getTelecastStatusLabel(telecastStatus)}
                </span>
                {showTelecastPlayer ? (
                  <button
                    className={styles.telecastActionButton}
                    onClick={handleTelecastFullscreen}
                    type="button"
                  >
                    Fullscreen
                  </button>
                ) : null}
              </div>
            </div>

            {showTelecastPlayer ? (
              <div className={styles.telecastFrameWrap} ref={telecastFrameWrapRef}>
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className={styles.telecastFrame}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={telecastUrl}
                  title={`${match.homeTeam} vs ${match.awayTeam} live telecast`}
                />
                <div className={styles.telecastScoreboard}>
                  <div className={styles.telecastScoreboardTeams}>
                    <div className={styles.telecastTeamBlock}>
                      {match.homeLogo ? (
                        <img
                          alt={`${match.homeTeam} logo`}
                          className={styles.telecastTeamLogo}
                          src={match.homeLogo}
                        />
                      ) : (
                        <span className={styles.telecastTeamName}>{match.homeTeam}</span>
                      )}
                    </div>
                    <span className={styles.telecastScoreValue}>{homeScore} - {awayScore}</span>
                    <div className={styles.telecastTeamBlock}>
                      {match.awayLogo ? (
                        <img
                          alt={`${match.awayTeam} logo`}
                          className={styles.telecastTeamLogo}
                          src={match.awayLogo}
                        />
                      ) : (
                        <span className={styles.telecastTeamName}>{match.awayTeam}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.telecastScoreboardMeta}>
                    {match.phaseLabel ? (
                      <span className={styles.telecastPhase}>{match.phaseLabel}</span>
                    ) : (
                      <span className={styles.telecastStatusBadge}>{displayStatus}</span>
                    )}
                    {liveClock ? <span className={styles.telecastClock}>{liveClock}</span> : null}
                  </div>
                </div>

                {showBottomScore ? (
                  <div className={styles.bottomScoreboard}>
                    <div className={styles.bottomScoreTopRow}>
                      <div className={styles.bottomScoreTeamHeader}>
                        {match.homeLogo ? (
                          <img
                            alt={`${match.homeTeam} logo`}
                            className={styles.bottomScoreLogo}
                            src={match.homeLogo}
                          />
                        ) : null}
                        <span className={styles.bottomScoreTeamName}>{match.homeTeam}</span>
                      </div>
                      <div className={styles.bottomScoreCenter}>
                        <span className={styles.bottomScoreValue}>{homeScore} : {awayScore}</span>
                        {liveClock ? <span className={styles.bottomScoreClock}>{liveClock}</span> : null}
                      </div>
                      <div className={`${styles.bottomScoreTeamHeader} ${styles.bottomScoreTeamHeaderRight}`}>
                        <span className={styles.bottomScoreTeamName}>{match.awayTeam}</span>
                        {match.awayLogo ? (
                          <img
                            alt={`${match.awayTeam} logo`}
                            className={styles.bottomScoreLogo}
                            src={match.awayLogo}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.bottomScoreBottomRow}>
                      <div className={styles.bottomScoreScorers}>
                        {homeGoalScorers.length ? (
                          homeGoalScorers.map((entry) => (
                            <div className={styles.bottomScoreScorerRow} key={entry.id}>
                              <span>{entry.player}</span>
                              <span className={styles.bottomScoreScorerTime}>{entry.time}</span>
                            </div>
                          ))
                        ) : (
                          <span className={styles.bottomScoreEmpty}>No scorers yet</span>
                        )}
                      </div>
                      <div className={styles.bottomScoreSpacer} />
                      <div className={styles.bottomScoreScorers}>
                        {awayGoalScorers.length ? (
                          awayGoalScorers.map((entry) => (
                            <div className={styles.bottomScoreScorerRow} key={entry.id}>
                              <span>{entry.player}</span>
                              <span className={styles.bottomScoreScorerTime}>{entry.time}</span>
                            </div>
                          ))
                        ) : (
                          <span className={styles.bottomScoreEmpty}>No scorers yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {telecastOverlay !== "none" && overlayPlayers.length ? (
                  <div className={styles.telecastOverlay}>
                    <div className={styles.telecastOverlayCard}>
                      <p className={styles.telecastOverlayKicker}>Starting Lineup</p>
                      <h3 className={styles.telecastOverlayTitle}>{overlayTeamName}</h3>
                      <div className={styles.telecastOverlayBody}>
                        <div className={styles.telecastOverlayLogoWrap}>
                          {overlayTeamLogo ? (
                            <img
                              alt={`${overlayTeamName} logo`}
                              className={styles.telecastOverlayLogo}
                              src={overlayTeamLogo}
                            />
                          ) : (
                            <span className={styles.telecastOverlayLogoFallback}>
                              {overlayTeamName?.slice(0, 1) || "T"}
                            </span>
                          )}
                        </div>
                        <div className={styles.telecastOverlayList}>
                          {overlayPlayers.map((player) => (
                            <div
                              className={styles.telecastOverlayRow}
                              key={`${overlayTeamName}-${player.player}-${player.role}`}
                            >
                              <span>{player.player}</span>
                              <span className={styles.telecastOverlayRole}>{formatRole(player.role)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <img alt="Codactics TV" className={styles.telecastCornerLogo} src={codacticsGif.src} />
              </div>
            ) : showPausedTelecast ? (
              <div className={`${styles.telecastFrameWrap} ${styles.telecastFrameWrapPaused}`}>
                <div className={styles.telecastPausedState}>
                  <p className={styles.telecastPausedBadge}>Paused</p>
                  <p className={styles.telecastPausedTitle}>Live telecast is paused</p>
                  <p className={styles.telecastPausedText}>
                    The admin paused this video. It will resume here when switched back to live.
                  </p>
                </div>
                <img alt="Codactics TV" className={styles.telecastCornerLogo} src={codacticsGif.src} />
              </div>
            ) : (
              <div className={styles.telecastState}>Telecast is offline right now.</div>
            )}
          </section>
        ) : null}

        {mvpEntries.length ? (
          <section className={styles.mvpCard}>
            <h2 className={styles.sectionTitle}>MVP</h2>
            <div className={styles.mvpList}>
              {mvpEntries.map((entry) => {
                const playerName = String(entry.subjectLabel || "").trim();
                const teamName = String(entry.teamName || "").trim();

                return (
                  <div className={styles.mvpRow} key={entry.id}>
                    <span className={styles.mvpBadge}>MVP</span>
                    <span className={styles.mvpName}>
                      {playerName || teamName || "Selected player"}
                    </span>
                    {teamName && playerName !== teamName ? (
                      <span className={styles.mvpTeam}>{teamName}</span>
                    ) : null}
                    {entry.note ? <span className={styles.mvpNote}>{entry.note}</span> : null}
                  </div>
                );
              })}
            </div>
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
            {matchEventEntries.length ? (
              matchEventEntries.map((entry) => (
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
