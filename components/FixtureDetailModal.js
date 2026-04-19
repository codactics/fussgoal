"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import codacticsGif from "../logo/codactics.gif";
import { formatMatchClock, getMatchClockSeconds } from "./manageTournamentUtils";
import styles from "./FixtureDetailModal.module.css";

function formatRole(role) {
  if (!role) {
    return "";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function ScoreDigit({ value, animate }) {
  return (
    <span className={`${styles.scoreDigit} ${animate ? styles.scoreDigitFlip : ""}`}>
      <span className={styles.scoreDigitInner}>{value}</span>
    </span>
  );
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

function getOverlayPlayers(lineup, overlay) {
  if (overlay === "home") {
    return Array.isArray(lineup?.home) ? lineup.home : [];
  }

  if (overlay === "away") {
    return Array.isArray(lineup?.away) ? lineup.away : [];
  }

  return [];
}

function getGoalScorers(fixture, side) {
  const teamName = side === "home" ? fixture?.homeTeam : fixture?.awayTeam;
  const entries = Array.isArray(fixture?.timelineEntries) ? fixture.timelineEntries : [];

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

export default function FixtureDetailModal({ fixture, onClose }) {
  const [showGoalEffect, setShowGoalEffect] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [changedSide, setChangedSide] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const previousScoreRef = useRef(`${fixture?.score?.home ?? 0}:${fixture?.score?.away ?? 0}`);
  const isLive = fixture?.status === "Live";
  const isPaused = fixture?.statusRecord?.matchStatus === "paused";

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);
  useEffect(() => {
    const currentScore = `${fixture?.score?.home ?? 0}:${fixture?.score?.away ?? 0}`;
    const previousScore = previousScoreRef.current;
    const isLive = fixture?.status === "Live";

    if (isLive && previousScore !== currentScore) {
      const [previousHome, previousAway] = previousScore.split(":").map(Number);
      const [currentHome, currentAway] = currentScore.split(":").map(Number);

      if (currentHome > previousHome || currentAway > previousAway) {
        setChangedSide(currentHome > previousHome ? "home" : currentAway > previousAway ? "away" : "");
        setShowGoalEffect(true);
        const timeoutId = window.setTimeout(() => {
          setShowGoalEffect(false);
          setChangedSide("");
        }, 2800);
        previousScoreRef.current = currentScore;
        return () => {
          window.clearTimeout(timeoutId);
        };
      }
    }

    previousScoreRef.current = currentScore;
    return undefined;
  }, [fixture?.score?.away, fixture?.score?.home, fixture?.status]);
  useEffect(() => {
    if (fixture?.statusRecord?.matchStatus !== "running") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fixture?.statusRecord?.matchStatus]);

  const liveClock = useMemo(() => {
    if (!fixture?.statusRecord) {
      return fixture?.clockText || "";
    }

    return formatMatchClock(getMatchClockSeconds(fixture.statusRecord, timerNow));
  }, [fixture, timerNow]);
  const homeScore = String(fixture?.score?.home ?? 0);
  const awayScore = String(fixture?.score?.away ?? 0);
  const telecastUrl = String(fixture?.telecast?.url || "").trim();
  const telecastEmbedUrl = telecastUrl;
  const telecastStatus = String(fixture?.telecast?.status || "stopped");
  const telecastOverlay = String(fixture?.telecast?.overlay || "none");
  const showBottomScore = Boolean(fixture?.telecast?.bottomScore);
  const hasTelecastSource = Boolean(telecastEmbedUrl);
  const [viewerTelecastMode, setViewerTelecastMode] = useState(hasTelecastSource ? "shown" : "hidden");
  const showTelecastPlayer = Boolean(telecastEmbedUrl) && telecastStatus === "live";
  const showPausedTelecast = Boolean(telecastEmbedUrl) && telecastStatus === "paused";
  const overlayPlayers = getOverlayPlayers(fixture?.lineup, telecastOverlay);
  const overlayTeamName =
    telecastOverlay === "home"
      ? fixture?.homeTeam
      : telecastOverlay === "away"
        ? fixture?.awayTeam
        : "";
  const overlayTeamLogo =
    telecastOverlay === "home"
      ? fixture?.homeLogo
      : telecastOverlay === "away"
        ? fixture?.awayLogo
        : "";
  const homeGoalScorers = getGoalScorers(fixture, "home");
  const awayGoalScorers = getGoalScorers(fixture, "away");
  const canShareMatch = Boolean(fixture?.matchSlug);

  async function handleShareMatch() {
    if (!fixture?.matchSlug || typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/match/${fixture.matchSlug}`;
    const shareData = {
      title: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
      text: `${fixture.homeTeam} vs ${fixture.awayTeam} live match link`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Match link shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("Match link copied.");
      } else {
        setShareMessage("Sharing is not supported on this device.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      setShareMessage("Unable to share the match link.");
    }
  }

  useEffect(() => {
    setViewerTelecastMode(hasTelecastSource ? "shown" : "hidden");
  }, [fixture?.id, hasTelecastSource]);

  useEffect(() => {
    setShareMessage("");
  }, [fixture?.id]);

  if (!fixture) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>{fixture.sectionTitle || "Fixture Detail"}</p>
            <h2 className={styles.title}>
              {fixture.homeTeam} vs {fixture.awayTeam}
            </h2>
            <p className={styles.meta}>
              {fixture.date || "TBD"} | {fixture.time || "TBD"}
            </p>
            {shareMessage ? <p className={styles.shareMessage}>{shareMessage}</p> : null}
          </div>
          <div className={styles.headerActions}>
            {canShareMatch ? (
              <button className={styles.shareButton} onClick={handleShareMatch} type="button">
                Share Match Link
              </button>
            ) : null}
            <button className={styles.closeButton} onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className={`${styles.scoreCard} ${showGoalEffect ? styles.goalScoreCard : ""}`}>
          <div className={styles.teamBlock}>
            {fixture.homeLogo ? (
              <img
                alt={`${fixture.homeTeam} logo`}
                className={styles.teamLogo}
                src={fixture.homeLogo}
              />
            ) : (
              <span className={styles.teamLogoFallback}>{fixture.homeTeam?.slice(0, 1) || "H"}</span>
            )}
            <span className={styles.teamName}>{fixture.homeTeam}</span>
          </div>
          <div className={styles.centerBlock}>
            {showGoalEffect ? <div className={styles.goalBanner}>GOAL!</div> : null}
            <div className={styles.statusRow}>
              <span className={`${styles.status} ${isLive ? styles.liveStatus : ""}`}>
                {isLive ? <span className={styles.liveDot} aria-hidden="true" /> : null}
                {fixture.status}
              </span>
              {fixture.phaseLabel ? <span className={styles.phase}>{fixture.phaseLabel}</span> : null}
            </div>
            <div className={styles.scoreBoard}>
              <div className={styles.score}>
                <ScoreDigit animate={changedSide === "home"} value={homeScore} />
                <span className={styles.scoreDivider}>:</span>
                <ScoreDigit animate={changedSide === "away"} value={awayScore} />
              </div>
            </div>
            <div className={styles.clockMeta}>
              {liveClock ? <div className={styles.clock}>{liveClock}</div> : null}
              {isPaused ? <div className={styles.interruption}>Interruption</div> : null}
            </div>
          </div>
          <div className={styles.teamBlock}>
            {fixture.awayLogo ? (
              <img
                alt={`${fixture.awayTeam} logo`}
                className={styles.teamLogo}
                src={fixture.awayLogo}
              />
            ) : (
              <span className={styles.teamLogoFallback}>{fixture.awayTeam?.slice(0, 1) || "A"}</span>
            )}
            <span className={styles.teamName}>{fixture.awayTeam}</span>
          </div>
        </div>

        {hasTelecastSource ? (
          <section className={styles.card}>
            <div className={styles.telecastHeader}>
              <div className={styles.telecastHeaderIntro}>
                <p className={styles.kicker}>Codactics TV</p>
                <h3 className={styles.sectionTitle}>Live Match Telecast</h3>
              </div>
              <div className={styles.telecastViewerControls}>
                <button
                  className={`${styles.telecastControlButton} ${
                    viewerTelecastMode === "shown" ? styles.telecastControlButtonActive : ""
                  }`}
                  onClick={() => setViewerTelecastMode("shown")}
                  type="button"
                >
                  Show
                </button>
                <button
                  className={`${styles.telecastControlButton} ${
                    viewerTelecastMode === "hidden" ? styles.telecastControlButtonActive : ""
                  }`}
                  onClick={() => setViewerTelecastMode("hidden")}
                  type="button"
                >
                  Hide
                </button>
              </div>
              <div className={styles.telecastHeaderActions}>
                <span
                  className={`${styles.telecastBadge} ${
                    telecastStatus === "live"
                      ? styles.telecastBadgeLive
                      : telecastStatus === "paused"
                        ? styles.telecastBadgePaused
                        : styles.telecastBadgeStopped
                  }`}
                >
                  {getTelecastStatusLabel(telecastStatus)}
                </span>
              </div>
            </div>
            {viewerTelecastMode === "hidden" ? (
              <p className={styles.empty}>Live TV is hidden. Press Show to display it again.</p>
            ) : showTelecastPlayer ? (
              <div className={styles.telecastFrameWrap}>
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className={styles.telecastFrame}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={telecastEmbedUrl}
                  title={`${fixture.homeTeam} vs ${fixture.awayTeam} live telecast`}
                />
                <div className={styles.telecastScoreboard}>
                  <div className={styles.telecastScoreboardTeams}>
                    <div className={styles.telecastTeamBlock}>
                      {fixture.homeLogo ? (
                        <img
                          alt={`${fixture.homeTeam} logo`}
                          className={styles.telecastTeamLogo}
                          src={fixture.homeLogo}
                        />
                      ) : (
                        <span className={styles.telecastTeamName}>{fixture.homeTeam}</span>
                      )}
                    </div>
                    <span className={styles.telecastScoreValue}>
                      {homeScore} - {awayScore}
                    </span>
                    <div className={styles.telecastTeamBlock}>
                      {fixture.awayLogo ? (
                        <img
                          alt={`${fixture.awayTeam} logo`}
                          className={styles.telecastTeamLogo}
                          src={fixture.awayLogo}
                        />
                      ) : (
                        <span className={styles.telecastTeamName}>{fixture.awayTeam}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.telecastScoreboardMeta}>
                    {fixture.phaseLabel ? (
                      <span className={styles.telecastPhase}>{fixture.phaseLabel}</span>
                    ) : (
                      <span
                        className={`${styles.telecastStatusBadge} ${
                          isLive ? styles.telecastStatusBadgeLive : ""
                        }`}
                      >
                        {fixture.status}
                      </span>
                    )}
                    {liveClock ? <span className={styles.telecastClock}>{liveClock}</span> : null}
                  </div>
                </div>
                {showBottomScore ? (
                  <div className={styles.bottomScoreboard}>
                    <div className={styles.bottomScoreTopRow}>
                      <div className={styles.bottomScoreTeamHeader}>
                        {fixture.homeLogo ? (
                          <img
                            alt={`${fixture.homeTeam} logo`}
                            className={styles.bottomScoreLogo}
                            src={fixture.homeLogo}
                          />
                        ) : null}
                        <span className={styles.bottomScoreTeamName}>{fixture.homeTeam}</span>
                      </div>
                      <div className={styles.bottomScoreCenter}>
                        <span className={styles.bottomScoreValue}>
                          {homeScore} : {awayScore}
                        </span>
                        {liveClock ? <span className={styles.bottomScoreClock}>{liveClock}</span> : null}
                      </div>
                      <div className={`${styles.bottomScoreTeamHeader} ${styles.bottomScoreTeamHeaderRight}`}>
                        <span className={styles.bottomScoreTeamName}>{fixture.awayTeam}</span>
                        {fixture.awayLogo ? (
                          <img
                            alt={`${fixture.awayTeam} logo`}
                            className={styles.bottomScoreLogo}
                            src={fixture.awayLogo}
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
                      <h4 className={styles.telecastOverlayTitle}>{overlayTeamName}</h4>
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
                <img
                  alt="Codactics TV"
                  className={styles.telecastCornerLogo}
                  src={codacticsGif.src}
                />
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
                <img
                  alt="Codactics TV"
                  className={styles.telecastCornerLogo}
                  src={codacticsGif.src}
                />
              </div>
            ) : (
              <p className={styles.empty}>Telecast is offline right now.</p>
            )}
          </section>
        ) : null}

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Line Up</h3>
            <div className={styles.lineupGrid}>
              <div className={styles.lineupTeamCard}>
                <div className={styles.lineupTeamHeader}>
                  <p className={styles.lineupTitle}>{fixture.homeTeam}</p>
                </div>
                <div className={styles.lineupTeamBody}>
                  <div className={styles.lineupPlayersList}>
                    {fixture.lineup?.home?.length ? (
                      fixture.lineup.home.map((player) => (
                        <div className={styles.lineupRow} key={`home-${player.player}-${player.role}`}>
                          <span>{player.player}</span>
                          <span className={styles.lineupRole}>{formatRole(player.role)}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.empty}>No lineup saved yet.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.lineupTeamCard}>
                <div className={styles.lineupTeamHeader}>
                  <p className={styles.lineupTitle}>{fixture.awayTeam}</p>
                </div>
                <div className={styles.lineupTeamBody}>
                  <div className={styles.lineupPlayersList}>
                    {fixture.lineup?.away?.length ? (
                      fixture.lineup.away.map((player) => (
                        <div className={styles.lineupRow} key={`away-${player.player}-${player.role}`}>
                          <span>{player.player}</span>
                          <span className={styles.lineupRole}>{formatRole(player.role)}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.empty}>No lineup saved yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Match History</h3>
            {fixture.timelineEntries?.length ? (
              <div className={styles.timeline}>
                {fixture.timelineEntries.map((entry) => (
                  <div className={styles.timelineRow} key={entry.id}>
                    <span className={styles.timelineTime}>{entry.displayTime}</span>
                    <div className={styles.timelineTextWrap}>
                      <span className={styles.timelineText}>{entry.text}</span>
                      {entry.note ? <span className={styles.timelineNote}>{entry.note}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No match history yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
