import styles from "./FixtureCard.module.css";

export default function FixtureCard({ fixture }) {
  return (
    <article className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.status}>{fixture.status}</span>
      </div>

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

      <div className={styles.meta}>
        <p className={styles.metaLabel}>Date</p>
        <p className={styles.metaValue}>{fixture.date}</p>
      </div>

      <div className={styles.meta}>
        <p className={styles.metaLabel}>Time</p>
        <p className={styles.metaValue}>{fixture.time}</p>
      </div>
    </article>
  );
}
