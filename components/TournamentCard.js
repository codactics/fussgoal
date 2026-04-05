import Link from "next/link";
import styles from "./TournamentCard.module.css";

export default function TournamentCard({ tournament, variant, href }) {
  const content = (
    <>
      <h3 className={styles.name}>{tournament.name}</h3>

      {variant === "ongoing" ? (
        <>
          <p className={styles.meta}>Matches: {tournament.matches}</p>
          <span className={`${styles.tag} ${styles.ongoing}`}>{tournament.status}</span>
        </>
      ) : null}

      {variant === "upcoming" ? (
        <>
          <p className={styles.label}>Start Date</p>
          <p className={styles.value}>{tournament.startDate}</p>
        </>
      ) : null}

      {variant === "past" ? (
        <>
          <p className={styles.label}>Winner</p>
          <p className={styles.value}>{tournament.winner}</p>
        </>
      ) : null}
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
