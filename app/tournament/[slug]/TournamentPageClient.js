"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import SectionContainer from "../../../components/SectionContainer";
import MatchCard from "../../../components/MatchCard";
import FixtureCard from "../../../components/FixtureCard";
import FixtureDetailModal from "../../../components/FixtureDetailModal";
import TournamentPanels from "../../../components/TournamentPanels";
import {
  getStoredImageUrl,
  normalizeSavedTournament,
} from "../../../components/launchedTournamentUtils";
import styles from "./page.module.css";

const SAVED_TOURNAMENTS_EVENT = "saved-tournaments-updated";
const LAUNCHED_TOURNAMENT_REFRESH_MS = 2000;
const SUMMARY_ACTIONS = [
  { key: "topScorer", title: "Top Scorer", valueLabel: "Goals", accent: "#0f6a4c" },
  { key: "assist", title: "Assist", valueLabel: "Assists", accent: "#6f42c1" },
  { key: "cleanSheet", title: "Clean Sheet", valueLabel: "Clean Sheets", accent: "#1967d2" },
  { key: "yellowCard", title: "Yellow Card", valueLabel: "Cards", accent: "#b7791f" },
  { key: "redCard", title: "Red Card", valueLabel: "Cards", accent: "#c62828" },
];

function getFixtureScheduleTimestamp(fixture) {
  const dateValue = String(fixture?.date || "").trim();
  const timeValue = String(fixture?.time || "").trim();

  if (!dateValue || dateValue === "TBD") {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedTime = timeValue && timeValue !== "TBD" ? timeValue : "23:59";
  const timestamp = new Date(`${dateValue}T${normalizedTime}:00`).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function buildTournamentSeoSummary(tournament, fixtureCount) {
  const tournamentName = String(tournament?.name || "This tournament").trim();
  const description = String(tournament?.description || "").trim();
  const matchesLabel = fixtureCount === 1 ? "1 match" : `${fixtureCount} matches`;

  if (description) {
    return `${tournamentName} tournament hub with ${matchesLabel}, live scores, fixtures, standings, and results. ${description}`;
  }

  return `${tournamentName} tournament hub with ${matchesLabel}, live scores, fixtures, standings, and results on FussGoal.`;
}

function hasMatchStarted(statusRecord) {
  return Boolean(
    statusRecord &&
      (["running", "paused", "halftime", "ended"].includes(String(statusRecord.matchStatus || "")) ||
        Number.isFinite(statusRecord?.systemMoments?.kickoff) ||
        (Array.isArray(statusRecord.events) && statusRecord.events.length))
  );
}

function getSummarySubject(event, fallbackTeam = "") {
  const player = String(event?.subjectLabel || "").trim();
  const team = String(event?.teamName || fallbackTeam || "").trim();

  return {
    label: player || team || "Unknown",
    team,
  };
}

function incrementSummary(map, key, row) {
  if (!key) {
    return;
  }

  const current = map.get(key) || {
    label: row.label,
    team: row.team,
    value: 0,
  };

  current.value += 1;
  map.set(key, current);
}

function getSortedSummaryRows(map) {
  return Array.from(map.values()).sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return `${left.label} ${left.team}`.localeCompare(`${right.label} ${right.team}`);
  });
}

function buildPublicSummaryTables(tournament) {
  const scorers = new Map();
  const cleanSheets = new Map();
  const redCards = new Map();
  const yellowCards = new Map();
  const assists = new Map();
  const fixtures = tournament?.fixtureSections?.length
    ? tournament.fixtureSections.flatMap((section) => section.matches || [])
    : tournament?.fixtures || [];

  fixtures.forEach((fixture) => {
    const statusRecord = fixture?.statusRecord;

    if (!hasMatchStarted(statusRecord)) {
      return;
    }

    const homeTeam = String(fixture.homeTeam || fixture.home || "").trim();
    const awayTeam = String(fixture.awayTeam || fixture.away || "").trim();
    const score = fixture.score || { home: 0, away: 0 };

    if (homeTeam && Number(score.away) === 0) {
      incrementSummary(cleanSheets, homeTeam, { label: homeTeam, team: "" });
    }
    if (awayTeam && Number(score.home) === 0) {
      incrementSummary(cleanSheets, awayTeam, { label: awayTeam, team: "" });
    }

    (statusRecord?.events || []).forEach((event) => {
      const subject = getSummarySubject(event);
      const subjectKey = `${subject.team}::${subject.label}`;

      if (event.action === "goal" || event.action === "penalty-goal") {
        incrementSummary(scorers, subjectKey, subject);
      }
      if (event.action === "assist") {
        incrementSummary(assists, subjectKey, subject);
      }
      if (event.action === "red") {
        incrementSummary(redCards, subjectKey, subject);
      }
      if (event.action === "yellow") {
        incrementSummary(yellowCards, subjectKey, subject);
      }
    });
  });

  const rowMaps = {
    topScorer: scorers,
    cleanSheet: cleanSheets,
    redCard: redCards,
    yellowCard: yellowCards,
    assist: assists,
  };

  return SUMMARY_ACTIONS.map((summary) => ({
    ...summary,
    rows: getSortedSummaryRows(rowMaps[summary.key]),
  }));
}

export default function TournamentPageClient({
  slug,
  staticTournament,
  staticMatches,
  initialLaunchedTournament = null,
}) {
  const [launchedTournament, setLaunchedTournament] = useState(initialLaunchedTournament);
  const [isLoaded, setIsLoaded] = useState(!slug.startsWith("launched-") || Boolean(initialLaunchedTournament));
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [activeSummaryKey, setActiveSummaryKey] = useState(null);

  useEffect(() => {
    async function loadLaunchedTournament() {
      if (!slug.startsWith("launched-")) {
        setIsLoaded(true);
        return;
      }

      try {
        const tournamentId = slug.replace("launched-", "");
        const response = await fetch(`/api/tournaments/${tournamentId}`, {
          cache: "no-store",
        });
        const result = await response.json();
        const match =
          response.ok && result.tournament?.launched ? result.tournament : null;

        setLaunchedTournament(match ? normalizeSavedTournament(match) : null);
      } catch {
        setLaunchedTournament(null);
      } finally {
        setIsLoaded(true);
      }
    }

    void loadLaunchedTournament();

    window.addEventListener(SAVED_TOURNAMENTS_EVENT, loadLaunchedTournament);
    const intervalId = slug.startsWith("launched-")
      ? window.setInterval(loadLaunchedTournament, LAUNCHED_TOURNAMENT_REFRESH_MS)
      : null;

    return () => {
      window.removeEventListener(SAVED_TOURNAMENTS_EVENT, loadLaunchedTournament);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [initialLaunchedTournament, slug]);

  const tournament = useMemo(
    () => (slug.startsWith("launched-") ? launchedTournament : staticTournament),
    [launchedTournament, slug, staticTournament]
  );
  const fixtureList = useMemo(
    () =>
      tournament?.fixtureSections?.length
        ? tournament.fixtureSections.flatMap((section) => section.matches || [])
        : tournament?.fixtures || [],
    [tournament]
  );
  const liveFixtures = useMemo(
    () =>
      fixtureList.filter((fixture) =>
        ["running", "paused", "halftime"].includes(
          String(fixture?.statusRecord?.matchStatus || "")
        )
      ),
    [fixtureList]
  );
  const upcomingFixtures = useMemo(() => {
    const now = Date.now();

    return fixtureList
      .filter((fixture) => {
        const matchStatus = String(fixture?.statusRecord?.matchStatus || "");
        if (["running", "halftime", "ended"].includes(matchStatus)) {
          return false;
        }

        return getFixtureScheduleTimestamp(fixture) >= now;
      })
      .sort((left, right) => getFixtureScheduleTimestamp(left) - getFixtureScheduleTimestamp(right))
      .slice(0, 2);
  }, [fixtureList]);

  const tournamentMatches = slug.startsWith("launched-") ? [] : staticMatches;
  const tournamentLogoUrl = getStoredImageUrl(tournament?.tournamentLogo);
  const seoSummary = useMemo(
    () => buildTournamentSeoSummary(tournament, fixtureList.length),
    [fixtureList.length, tournament]
  );
  const seoHighlights = useMemo(
    () => [
      `${tournament.name} fixtures and schedule`,
      `${tournament.name} standings and points table`,
      `${tournament.name} live scores and match results`,
    ],
    [tournament.name]
  );
  const tournamentSummaryTables = useMemo(
    () => buildPublicSummaryTables(tournament),
    [tournament]
  );

  useEffect(() => {
    if (!selectedFixture?.fixtureKey) {
      return;
    }

    const refreshedFixture = fixtureList.find(
      (fixture) => fixture.fixtureKey === selectedFixture.fixtureKey
    );

    if (refreshedFixture) {
      setSelectedFixture(refreshedFixture);
    }
  }, [fixtureList, selectedFixture]);

  if (slug.startsWith("launched-") && !isLoaded) {
    return (
      <main className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <section className={styles.notFoundCard}>
            <h1 className={styles.heading}>Loading tournament</h1>
            <p className={styles.notFoundText}>Fetching launched tournament details.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <section className={styles.notFoundCard}>
            <h1 className={styles.heading}>Tournament not found</h1>
            <p className={styles.notFoundText}>
              The tournament you are looking for does not exist in the current data.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Tournament Overview</p>
          <div className={styles.heroRow}>
            {tournamentLogoUrl ? (
              <img
                alt={`${tournament.name} logo`}
                className={styles.tournamentLogo}
                src={tournamentLogoUrl}
              />
            ) : null}
            <h1 className={styles.heading}>{tournament.name}</h1>
          </div>
        </section>

        <section className={styles.seoIntroCard} aria-labelledby="tournament-seo-title">
          <h2 id="tournament-seo-title" className={styles.seoTitle}>
            {tournament.name} tournament overview
          </h2>
          <p className={styles.seoText}>{seoSummary}</p>
          <p className={styles.seoText}>
            Use this page to follow the {tournament.name} tournament schedule, upcoming matches,
            current standings, and latest results in one place.
          </p>
          <ul className={styles.seoList}>
            {seoHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <p className={styles.label}>Status</p>
            <p className={styles.value}>{tournament.status}</p>
          </div>
          <div className={styles.summaryItem}>
            <p className={styles.label}>Matches</p>
            <p className={styles.value}>{tournament.matches}</p>
          </div>
          <div className={styles.summaryWide}>
            <p className={styles.label}>Description</p>
            <p className={styles.description}>{tournament.description}</p>
          </div>
        </section>

        <TournamentPanels tournament={tournament} onFixtureSelect={setSelectedFixture} />

        <SectionContainer
          title="Tournament Summery"
          description="Tap a row to open one tournament summary table at a time."
        >
          <div className={styles.summaryAccordion}>
            {tournamentSummaryTables.map((summaryTable) => {
              const isOpen = activeSummaryKey === summaryTable.key;

              return (
                <article
                  className={`${styles.summaryAccordionRow} ${isOpen ? styles.summaryAccordionRowOpen : ""}`}
                  key={summaryTable.key}
                  style={{ "--summary-accent": summaryTable.accent }}
                >
                  <button
                    aria-expanded={isOpen}
                    className={styles.summaryAccordionButton}
                    onClick={() => setActiveSummaryKey(isOpen ? null : summaryTable.key)}
                    type="button"
                  >
                    <span className={styles.summaryAccent} aria-hidden="true" />
                    <span className={styles.summaryAccordionTitle}>{summaryTable.title}</span>
                    <span className={styles.summaryAccordionCount}>{summaryTable.rows.length}</span>
                    <span className={styles.summaryAccordionIcon}>{isOpen ? "-" : "+"}</span>
                  </button>

                </article>
              );
            })}
          </div>
          {tournamentSummaryTables.map((summaryTable) =>
            activeSummaryKey === summaryTable.key ? (
              <div
                className={styles.summaryTableWrap}
                key={`table-${summaryTable.key}`}
                style={{ "--summary-accent": summaryTable.accent }}
              >
                {summaryTable.rows.length ? (
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player / Team</th>
                        <th>Team</th>
                        <th>{summaryTable.valueLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryTable.rows.map((row, index) => (
                        <tr key={`${summaryTable.key}-${row.team}-${row.label}`}>
                          <td>{index + 1}</td>
                          <td>{row.label}</td>
                          <td>{row.team || "-"}</td>
                          <td>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.emptyCard}>
                    <p className={styles.notFoundText}>
                      No {summaryTable.title.toLowerCase()} data yet.
                    </p>
                  </div>
                )}
              </div>
            ) : null
          )}
        </SectionContainer>

        {liveFixtures.length ? (
          <SectionContainer
            title={
              <span className={styles.liveSectionTitle}>
                <span className={styles.livePulse} aria-hidden="true" />
                Live Matches
              </span>
            }
            description="Matches currently in progress or at half time."
          >
            <div className={styles.matchGrid}>
              {liveFixtures.map((fixture) => (
                <FixtureCard
                  key={`live-${fixture.id}`}
                  fixture={fixture}
                  onClick={() => setSelectedFixture(fixture)}
                />
              ))}
            </div>
          </SectionContainer>
        ) : null}

        <SectionContainer
          title="Upcoming Matches"
          description="The next 2 scheduled matches based on the fixture date and time."
        >
          {upcomingFixtures.length ? (
            <div className={styles.matchGrid}>
              {upcomingFixtures.map((fixture) => (
                <FixtureCard
                  key={`upcoming-${fixture.id}`}
                  fixture={fixture}
                  onClick={() => setSelectedFixture(fixture)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <p className={styles.notFoundText}>No upcoming scheduled matches right now.</p>
            </div>
          )}
        </SectionContainer>

        {tournamentMatches.length ? (
          <SectionContainer
            title="Matches in this tournament"
            description="Sample match cards for this ongoing competition."
          >
            <div className={styles.matchGrid}>
              {tournamentMatches.map((match) => (
                <MatchCard key={match.id} match={match} href={`/match/${match.slug}`} />
              ))}
            </div>
          </SectionContainer>
        ) : null}

        {selectedFixture ? (
          <FixtureDetailModal fixture={selectedFixture} onClose={() => setSelectedFixture(null)} />
        ) : null}
      </div>
    </main>
  );
}
