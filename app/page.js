import Script from "next/script";
import Navbar from "../components/Navbar";
import LaunchedTournamentList from "../components/LaunchedTournamentList";
import styles from "./page.module.css";
import { buildAbsoluteUrl, getLaunchedTournamentRecords, getSiteUrl } from "../lib/site";
import { createLaunchedTournamentSlug, getTournamentDisplayStatus } from "../components/launchedTournamentUtils";

const siteUrl = getSiteUrl();
const homepageTitle = "Live Football Scores, Fixtures and Tournament Tables";
const homepageDescription =
  "FussGoal helps fans follow live football scores, fixtures, standings, tournament brackets, and match updates in one football scoreboard platform.";

export const metadata = {
  title: homepageTitle,
  description: homepageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `FussGoal | ${homepageTitle}`,
    description: homepageDescription,
    url: siteUrl,
    type: "website",
  },
  twitter: {
    title: `FussGoal | ${homepageTitle}`,
    description: homepageDescription,
  },
};

function getTournamentBucket(endDate) {
  return getTournamentDisplayStatus("", endDate) === "Past" ? "past" : "ongoing";
}

function SocialIcon({ platform }) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13.5 21v-7.3h2.5l.4-3h-2.9V8.8c0-.9.3-1.5 1.6-1.5h1.5V4.6c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.2H8.6v3h2.4V21h2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.45 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.4A4.6 4.6 0 1 1 7.4 12 4.6 4.6 0 0 1 12 7.4Zm0 1.8A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.6 7.2a2.9 2.9 0 0 0-2-2.1C17.8 4.5 12 4.5 12 4.5s-5.8 0-7.6.6a2.9 2.9 0 0 0-2 2.1A30.2 30.2 0 0 0 1.9 12a30.2 30.2 0 0 0 .5 4.8 2.9 2.9 0 0 0 2 2.1c1.8.6 7.6.6 7.6.6s5.8 0 7.6-.6a2.9 2.9 0 0 0 2-2.1 30.2 30.2 0 0 0 .5-4.8 30.2 30.2 0 0 0-.5-4.8ZM9.7 15.3V8.7l5.8 3.3-5.8 3.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default async function HomePage() {
  const launchedTournaments = await getLaunchedTournamentRecords();
  const initialTournaments = launchedTournaments.map((tournament) => ({
    ...tournament,
    slug: createLaunchedTournamentSlug(tournament.id),
    bucket: getTournamentBucket(tournament.endDate),
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "FussGoal",
        url: siteUrl,
        description: homepageDescription,
        inLanguage: "en",
        publisher: {
          "@type": "Organization",
          name: "CODACTICS",
          url: "https://www.codactics.com/",
        },
      },
      {
        "@type": "CollectionPage",
        name: "Football tournaments, fixtures and live scores",
        url: siteUrl,
        description: homepageDescription,
        isPartOf: {
          "@type": "WebSite",
          name: "FussGoal",
          url: siteUrl,
        },
        about: [
          {
            "@type": "SportsEvent",
            sport: "Football",
          },
          {
            "@type": "Thing",
            name: "Football tournament standings",
          },
        ],
        primaryImageOfPage: buildAbsoluteUrl("/opengraph-image"),
      },
    ],
  };

  return (
    <main className={styles.page}>
      <Script id="homepage-structured-data" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Fuss Goal</p>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleLine}>Live Football</span>
            <span className={styles.heroTitleLine}>Scores, Fixtures, Standing</span>
          </h1>
          <p className={styles.heroText}>
            Follow live football scores, explore tournaments, track standings, and never miss a match.
            <span className={styles.heroTextBreak}>
              FussGoal brings fixtures, results, scoreboards, and tournament updates into one football hub.
            </span>
          </p>
        </div>
      </section>

      <section className={styles.introSection} aria-labelledby="homepage-intro-title">
        <div className={styles.introCard}>
          <div className={styles.introHeader}>
            <p className={styles.introEyebrow}>Overview</p>
            <h2 id="homepage-intro-title" className={styles.sectionTitle}>
              Track football tournaments in one place
            </h2>
            <p className={styles.introLead}>
              Follow fixtures, standings, results, and tournament progress from one clean football
              scoreboard.
            </p>
          </div>

          <div className={styles.introBody}>
            <p className={styles.introText}>
              FussGoal is built for following matches, fixtures, standings, and tournament progress
              across competitions. Use it to check upcoming games, monitor live score updates, and
              review results from finished matches.
            </p>
            <p className={styles.introText}>
              Whether you want a quick football live score view or a full tournament overview with
              points tables and match pages, FussGoal keeps the essential information easy to browse.
            </p>
          </div>

          <div className={styles.introHighlights} aria-label="Homepage highlights">
            <span className={styles.introHighlight}>Live score updates</span>
            <span className={styles.introHighlight}>Tournament standings</span>
            <span className={styles.introHighlight}>Upcoming fixtures</span>
          </div>
        </div>
      </section>

      <section className={styles.socialSection} aria-label="CODACTICS social media">
        <div className={styles.socialSectionInner}>
          <a
            className={`${styles.socialCard} ${styles.facebookCard}`}
            href="https://www.facebook.com/Codactics"
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.socialIcon}>
              <SocialIcon platform="facebook" />
            </span>
            <span className={styles.socialText}>
              <strong>Facebook</strong>
              <span>Follow CODACTICS</span>
            </span>
          </a>

          <a
            className={`${styles.socialCard} ${styles.instagramCard}`}
            href="https://www.instagram.com/codactics"
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.socialIcon}>
              <SocialIcon platform="instagram" />
            </span>
            <span className={styles.socialText}>
              <strong>Instagram</strong>
              <span>See updates and highlights</span>
            </span>
          </a>

          <a
            className={`${styles.socialCard} ${styles.youtubeCard}`}
            href="https://www.youtube.com/@Codactics"
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.socialIcon}>
              <SocialIcon platform="youtube" />
            </span>
            <span className={styles.socialText}>
              <strong>YouTube</strong>
              <span>Subscribe for videos</span>
            </span>
          </a>
        </div>
      </section>

      <div className={styles.content}>
        <LaunchedTournamentList initialTournaments={initialTournaments} />
      </div>

      <section className={styles.featuresSection} aria-labelledby="homepage-features-title">
        <div className={styles.featuresCard}>
          <h2 id="homepage-features-title" className={styles.sectionTitle}>
            What you can follow on FussGoal
          </h2>
          <div className={styles.featureGrid}>
            <article className={styles.featureItem}>
              <h3>Live scores</h3>
              <p>Follow football scores as matches progress and review final results after full time.</p>
            </article>
            <article className={styles.featureItem}>
              <h3>Fixtures and schedules</h3>
              <p>Browse upcoming fixtures to see who is playing next and when tournaments continue.</p>
            </article>
            <article className={styles.featureItem}>
              <h3>Standings and tables</h3>
              <p>Check points tables, group standings, and tournament positions in a single dashboard.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
