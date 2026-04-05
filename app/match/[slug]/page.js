import Navbar from "../../../components/Navbar";
import SectionContainer from "../../../components/SectionContainer";
import { getMatchBySlug } from "../../../data/matches";
import styles from "./page.module.css";

export default async function MatchPage({ params }) {
  const { slug } = await params;
  const match = getMatchBySlug(slug);

  if (!match) {
    return (
      <main className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <section className={styles.notFoundCard}>
            <h1 className={styles.heading}>Match not found</h1>
            <p className={styles.notFoundText}>
              The match you are looking for does not exist in the current mock data.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const score = `${match.homeScore} - ${match.awayScore}`;
  const liveMinute = match.status === "LIVE" && match.minute ? match.minute : null;
  const homeLineup = [
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
  ];
  const awayLineup = [
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
  ];

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Match Overview</p>
          <h1 className={styles.heading}>
            {match.homeTeam} vs {match.awayTeam}
          </h1>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.scoreBlock}>
            <p className={styles.teamLine}>{match.homeTeam}</p>
            <p className={styles.score}>{score}</p>
            <p className={styles.teamLine}>{match.awayTeam}</p>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <p className={styles.label}>Status</p>
              <p className={styles.value}>{match.status}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Minute</p>
              <p className={styles.value}>{liveMinute ?? "Not live"}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Tournament</p>
              <p className={styles.value}>{match.tournament}</p>
            </div>
            <div className={styles.detailItem}>
              <p className={styles.label}>Venue</p>
              <p className={styles.value}>{match.venue}</p>
            </div>
            <div className={styles.detailWide}>
              <p className={styles.label}>Date</p>
              <p className={styles.value}>{match.date}</p>
            </div>
          </div>
        </section>

        <section className={styles.lineupCard}>
          <h2 className={styles.lineupTitle}>Team Line Up</h2>
          <div className={styles.lineupGrid}>
            <details className={styles.lineupColumn}>
              <summary className={styles.lineupSummary}>{match.homeTeam} Lineup</summary>
              <div className={styles.lineupContent}>
                <ol className={styles.lineupList}>
                  {homeLineup.map((player, index) => (
                    <li className={styles.lineupItem} key={`${match.homeTeam}-${index}`}>
                      {player}
                    </li>
                  ))}
                </ol>
              </div>
            </details>

            <details className={styles.lineupColumn}>
              <summary className={styles.lineupSummary}>{match.awayTeam} Lineup</summary>
              <div className={styles.lineupContent}>
                <ol className={styles.lineupList}>
                  {awayLineup.map((player, index) => (
                    <li className={styles.lineupItem} key={`${match.awayTeam}-${index}`}>
                      {player}
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          </div>
        </section>

        <SectionContainer
          title="Match Events"
          description="Static event timeline for this match."
        >
          <div className={styles.eventsList}>
            {match.events.map((event) => (
              <article className={styles.eventCard} key={event.id}>
                <div className={styles.eventMinute}>{event.minute}</div>
                <div className={styles.eventContent}>
                  {event.type === "Goal" ? (
                    <>
                      <p className={`${styles.eventType} ${styles.goalType}`}>Goal !!!!</p>
                      <p className={styles.eventMeta}>
                        {event.team} - {event.player}
                      </p>
                    </>
                  ) : event.type === "Substitution" ? (
                    <div className={styles.substitutionBlock}>
                      <p className={styles.eventMeta}>{event.team}</p>
                      <div className={styles.substitutionRow}>
                        <span className={`${styles.playerTag} ${styles.playerOut}`}>
                          <span className={styles.arrow}>↓</span>
                          OUT {event.outPlayer}
                        </span>
                        <span className={`${styles.playerTag} ${styles.playerIn}`}>
                          <span className={styles.arrow}>↑</span>
                          IN {event.inPlayer}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.eventType}>{event.type}</p>
                      <p className={styles.eventMeta}>
                        {event.team} - {event.player}
                      </p>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
