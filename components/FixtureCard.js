import { useEffect, useMemo, useRef, useState } from "react";
import { formatMatchClock, getMatchClockSeconds } from "./manageTournamentUtils";
import styles from "./FixtureCard.module.css";

export default function FixtureCard({ fixture, onClick }) {
  const [timerNow, setTimerNow] = useState(Date.now());
  const [showGoalEffect, setShowGoalEffect] = useState(false);
  const [changedSide, setChangedSide] = useState("");
  const isRunning = fixture?.statusRecord?.matchStatus === "running";
  const isLive = fixture?.status === "Live";
  const isPaused = fixture?.statusRecord?.matchStatus === "paused";
  const previousScoreRef = useRef(`${fixture?.score?.home ?? 0}:${fixture?.score?.away ?? 0}`);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const liveClock = useMemo(() => {
    if (!fixture?.statusRecord) {
      return fixture?.clockText || "";
    }

    return formatMatchClock(getMatchClockSeconds(fixture.statusRecord, timerNow));
  }, [fixture, timerNow]);
  useEffect(() => {
    const currentScore = `${fixture?.score?.home ?? 0}:${fixture?.score?.away ?? 0}`;
    const previousScore = previousScoreRef.current;

    if (isLive && previousScore !== currentScore) {
      const [previousHome, previousAway] = previousScore.split(":").map(Number);
      const [currentHome, currentAway] = currentScore.split(":").map(Number);

      if (currentHome > previousHome || currentAway > previousAway) {
        setChangedSide(currentHome > previousHome ? "home" : currentAway > previousAway ? "away" : "");
        setShowGoalEffect(true);
        const timeoutId = window.setTimeout(() => {
          setShowGoalEffect(false);
          setChangedSide("");
        }, 2600);
        previousScoreRef.current = currentScore;
        return () => {
          window.clearTimeout(timeoutId);
        };
      }
    }

    previousScoreRef.current = currentScore;
    return undefined;
  }, [fixture?.score?.away, fixture?.score?.home, isLive]);

  const CardTag = onClick ? "button" : "article";

  return (
    <CardTag
      className={`${styles.card} ${onClick ? styles.cardButton : ""} ${
        showGoalEffect ? styles.goalCard : ""
      }`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <div className={styles.topRow}>
        <span className={`${styles.status} ${isLive ? styles.liveStatus : ""}`}>
          {isLive ? <span className={styles.liveDot} aria-hidden="true" /> : null}
          {fixture.status}
        </span>
        {fixture.phaseLabel ? <span className={styles.phase}>{fixture.phaseLabel}</span> : null}
      </div>

      {isLive ? (
        <div className={styles.liveTeamsBoard}>
          <div className={styles.liveTeamSide}>
            {fixture.homeLogo ? (
              <img alt={`${fixture.homeTeam} logo`} className={styles.teamLogo} src={fixture.homeLogo} />
            ) : null}
            <p className={styles.team}>{fixture.homeTeam}</p>
          </div>
          <div className={styles.liveBoardCenter}>
            <div className={`${styles.scoreRow} ${styles.liveScoreRow}`}>
              {showGoalEffect ? <span className={styles.goalFlash}>GOAL!</span> : null}
              <p
                className={`${styles.scoreTile} ${styles.liveScoreValue} ${
                  changedSide === "home" ? styles.scoreTileFlip : ""
                }`}
              >
                {fixture.score.home}
              </p>
              <span className={styles.scoreDivider}>:</span>
              <p
                className={`${styles.scoreTile} ${styles.liveScoreValue} ${
                  changedSide === "away" ? styles.scoreTileFlip : ""
                }`}
              >
                {fixture.score.away}
              </p>
            </div>
            <div className={styles.liveClockMeta}>
              {liveClock ? <p className={`${styles.clock} ${styles.liveClock}`}>{liveClock}</p> : null}
              {isPaused ? <p className={styles.interruption}>Interruption</p> : null}
            </div>
          </div>
          <div className={`${styles.liveTeamSide} ${styles.liveTeamSideRight}`}>
            <p className={styles.team}>{fixture.awayTeam}</p>
            {fixture.awayLogo ? (
              <img alt={`${fixture.awayTeam} logo`} className={styles.teamLogo} src={fixture.awayLogo} />
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.teams}>
          <div className={styles.teamRow}>
            {fixture.homeLogo ? (
              <img alt={`${fixture.homeTeam} logo`} className={styles.teamLogo} src={fixture.homeLogo} />
            ) : null}
            <p className={styles.team}>{fixture.homeTeam}</p>
          </div>
          <p className={styles.vs}>vs</p>
          <div className={styles.teamRow}>
            {fixture.awayLogo ? (
              <img alt={`${fixture.awayTeam} logo`} className={styles.teamLogo} src={fixture.awayLogo} />
            ) : null}
            <p className={styles.team}>{fixture.awayTeam}</p>
          </div>
        </div>
      )}

      {fixture.score && !isLive ? (
        <div className={`${styles.scoreRow} ${isLive ? styles.liveScoreRow : ""}`}>
          {showGoalEffect ? <span className={styles.goalFlash}>GOAL!</span> : null}
          <p className={`${styles.scoreValue} ${isLive ? styles.liveScoreValue : ""}`}>
            {fixture.score.home}:{fixture.score.away}
          </p>
          {liveClock ? <p className={`${styles.clock} ${isLive ? styles.liveClock : ""}`}>{liveClock}</p> : null}
        </div>
      ) : null}

      <div className={styles.meta}>
        <p className={styles.metaLabel}>Date</p>
        <p className={styles.metaValue}>{fixture.date}</p>
      </div>

      <div className={styles.meta}>
        <p className={styles.metaLabel}>Time</p>
        <p className={styles.metaValue}>{fixture.time}</p>
      </div>
    </CardTag>
  );
}
