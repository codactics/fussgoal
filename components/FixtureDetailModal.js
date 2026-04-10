"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function FixtureDetailModal({ fixture, onClose }) {
  const [showGoalEffect, setShowGoalEffect] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [changedSide, setChangedSide] = useState("");
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
          </div>
          <button className={styles.closeButton} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className={`${styles.scoreCard} ${showGoalEffect ? styles.goalScoreCard : ""}`}>
          <div className={styles.teamBlock}>
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
            <span className={styles.teamName}>{fixture.awayTeam}</span>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Line Up</h3>
            <div className={styles.lineupGrid}>
              <div>
                <p className={styles.lineupTitle}>{fixture.homeTeam}</p>
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
              <div>
                <p className={styles.lineupTitle}>{fixture.awayTeam}</p>
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
