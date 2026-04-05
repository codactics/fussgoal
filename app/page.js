import Navbar from "../components/Navbar";
import LaunchedTournamentList from "../components/LaunchedTournamentList";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Fuss Goal</p>
          <h1 className={styles.heroTitle}>Fuss Goal — Your Football Hub</h1>
          <p className={styles.heroText}>
            Follow live scores, explore tournaments, and never miss a match.
            <span className={styles.heroTextBreak}>
              Everything from live action to final results, all in one clean dashboard.
            </span>
          </p>
        </div>
      </section>

      <div className={styles.content}>
        <LaunchedTournamentList />
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Developed and maintained by{" "}
          <a
            className={styles.footerLink}
            href="https://www.codactics.com/"
            target="_blank"
            rel="noreferrer"
          >
            CODACTICS
          </a>
        </p>
      </footer>
    </main>
  );
}
