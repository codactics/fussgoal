import Script from "next/script";
import Navbar from "../components/Navbar";
import LaunchedTournamentList from "../components/LaunchedTournamentList";
import styles from "./page.module.css";
import { buildAbsoluteUrl, getLaunchedTournamentRecords, getSiteUrl } from "../lib/site";
import { createLaunchedTournamentSlug, getTournamentDisplayStatus } from "../components/launchedTournamentUtils";

const siteUrl = getSiteUrl();
const socialImageUrl = buildAbsoluteUrl("/opengraph-image");
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
    images: [
      {
        url: socialImageUrl,
        width: 1200,
        height: 630,
        alt: "FussGoal live football scores, fixtures and tournament tables",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `FussGoal | ${homepageTitle}`,
    description: homepageDescription,
    images: [socialImageUrl],
  },
};

function getTournamentBucket(tournament) {
  if (tournament.phase === "past") {
    return "past";
  }

  const displayStatus = getTournamentDisplayStatus(tournament.startDate, tournament.endDate);

  if (displayStatus === "Past") {
    return "past";
  }

  if (displayStatus === "Upcoming") {
    return "upcoming";
  }

  return "ongoing";
}

export default async function HomePage() {
  const launchedTournaments = await getLaunchedTournamentRecords();
  const initialTournaments = launchedTournaments.map((tournament) => ({
    ...tournament,
    slug: createLaunchedTournamentSlug(tournament.id),
    bucket: getTournamentBucket(tournament),
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
        primaryImageOfPage: socialImageUrl,
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

      <div className={styles.content}>
        <LaunchedTournamentList initialTournaments={initialTournaments} />
      </div>

    </main>
  );
}
