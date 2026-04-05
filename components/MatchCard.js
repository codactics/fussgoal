import Link from "next/link";
import styles from "./MatchCard.module.css";

export default function MatchCard({ match, href }) {
  const isLive = match.status === "LIVE";
  const displayStatus = isLive && match.minute ? `${match.status} ${match.minute}` : match.status;
  const score = match.score ?? `${match.homeScore} - ${match.awayScore}`;
  const homeTeam = match.teamA ?? match.homeTeam;
  const awayTeam = match.teamB ?? match.awayTeam;

  const content = (
    <>
      <div className={styles.topRow}>
        <span className={`${styles.statusBadge} ${isLive ? styles.liveBadge : ""}`}>
          {isLive ? <span className={styles.liveDot} /> : null}
          {displayStatus}
        </span>
      </div>

      <div className={styles.teams}>
        <div className={styles.teamRow}>
          <span className={styles.teamName}>{homeTeam}</span>
        </div>
        <div className={styles.teamRow}>
          <span className={styles.teamName}>{awayTeam}</span>
        </div>
      </div>

      <div className={styles.score}>{score}</div>
    </>
  );

  if (href) {
    return (
      <Link className={`${styles.card} ${styles.clickable}`} href={href}>
        {content}
      </Link>
    );
  }

  return <article className={styles.card}>{content}</article>;
}
