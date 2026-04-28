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
    penaltyGoals: 0,
  };

  current.value += 1;
  if (row.penaltyGoal) {
    current.penaltyGoals += 1;
  }
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

    const subjectYellowCounts = new Map();
    (statusRecord?.events || []).forEach((event) => {
      const subject = getSummarySubject(event);
      const subjectKey = `${subject.team}::${subject.label}`;

      if (event.action === "goal" || event.action === "penalty-goal") {
        incrementSummary(scorers, subjectKey, {
          ...subject,
          penaltyGoal: event.action === "penalty-goal",
        });
      }
      if (event.action === "assist") {
        incrementSummary(assists, subjectKey, subject);
      }
      if (event.action === "red") {
        incrementSummary(redCards, subjectKey, subject);
      }
      if (event.action === "yellow") {
        incrementSummary(yellowCards, subjectKey, subject);
        const nextYellowCount = (subjectYellowCounts.get(subjectKey) || 0) + 1;
        subjectYellowCounts.set(subjectKey, nextYellowCount);
        if (nextYellowCount === 2) {
          incrementSummary(redCards, subjectKey, subject);
        }
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

function formatSummaryValue(summaryKey, row) {
  if (summaryKey === "topScorer" && row?.penaltyGoals) {
    return `${row.value}(${row.penaltyGoals})`;
  }

  return row?.value ?? 0;
}

function formatPlayerKey(playerKey) {
  const [teamName, ...playerParts] = String(playerKey || "").split("::");
  const playerName = playerParts.join("::").trim();
  const team = String(teamName || "").trim();

  if (playerName && team) {
    return `${playerName} (${team})`;
  }

  return playerName || team || "";
}

function getSummaryLeader(summaryTables, summaryKey) {
  const leader = summaryTables.find((table) => table.key === summaryKey)?.rows?.[0] || null;

  if (!leader) {
    return "";
  }

  return leader.team ? `${leader.label} (${leader.team})` : leader.label;
}

function getFixtureWinnerSide(fixture) {
  const score = fixture?.score || {};
  const homeScore = Number(score.home) || 0;
  const awayScore = Number(score.away) || 0;

  if (homeScore > awayScore) {
    return "home";
  }

  if (awayScore > homeScore) {
    return "away";
  }

  const penaltyWinnerSide = String(fixture?.penaltyWinnerSide || "");
  return penaltyWinnerSide === "home" || penaltyWinnerSide === "away" ? penaltyWinnerSide : "";
}

function getOverallKnockoutTeam(tournament, matchIndex, resultKind) {
  const targetMatchIndex = String(matchIndex || "");
  if (!targetMatchIndex) {
    return "";
  }

  const fixture =
    (tournament?.fixtureSections || [])
      .filter((section) => section.kind === "knockout")
      .flatMap((section) => section.matches || [])
      .find((match) => {
        const fixtureParts = String(match?.fixtureKey || "").split("-");
        return fixtureParts[2] === targetMatchIndex;
      }) || null;

  if (!fixture) {
    return "";
  }

  const winnerSide = getFixtureWinnerSide(fixture);
  if (!winnerSide) {
    return "";
  }

  const targetSide =
    resultKind === "loser" ? (winnerSide === "home" ? "away" : "home") : winnerSide;

  return targetSide === "home" ? fixture.homeTeam : fixture.awayTeam;
}

function buildOverallSummaryRows(tournament, summaryTables) {
  const summary = tournament?.overallSummary;

  if (!summary || typeof summary !== "object") {
    return [];
  }

  const rows = [
    {
      key: "champion",
      label: "Champion",
      value:
        summary.champion?.mode === "auto"
          ? getOverallKnockoutTeam(tournament, summary.champion?.knockoutMatchIndex, "winner")
          : String(summary.champion?.team || "").trim(),
    },
    {
      key: "runnerUp",
      label: "Runners Up",
      value:
        summary.runnerUp?.mode === "auto"
          ? getOverallKnockoutTeam(tournament, summary.runnerUp?.knockoutMatchIndex, "loser")
          : String(summary.runnerUp?.team || "").trim(),
    },
    {
      key: "bestGoalkeeper",
      label: "Best Goalkeeper",
      value:
        summary.bestGoalkeeper?.mode === "auto"
          ? getSummaryLeader(summaryTables, "cleanSheet")
          : formatPlayerKey(summary.bestGoalkeeper?.playerKey),
    },
    {
      key: "topScorer",
      label: "Top Scorer",
      value:
        summary.topScorer?.mode === "auto"
          ? getSummaryLeader(summaryTables, "topScorer")
          : formatPlayerKey(summary.topScorer?.playerKey),
    },
    {
      key: "bestPlayer",
      label: "Best Player",
      value: formatPlayerKey(summary.bestPlayer?.playerKey),
    },
  ];

  return rows.filter((row) => row.value);
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
  const tournamentDescription = String(tournament?.description || "").trim();
  const tournamentSummaryTables = useMemo(
    () => buildPublicSummaryTables(tournament),
    [tournament]
  );
  const overallSummaryRows = useMemo(
    () => buildOverallSummaryRows(tournament, tournamentSummaryTables),
    [tournament, tournamentSummaryTables]
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

        <section className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <p className={styles.label}>Status</p>
            <p className={styles.value}>{tournament.status}</p>
          </div>
          <div className={styles.summaryItem}>
            <p className={styles.label}>Matches</p>
            <p className={styles.value}>{tournament.matches}</p>
          </div>
          {tournamentDescription ? (
            <div className={styles.summaryWide}>
              <p className={styles.label}>Description</p>
              <p className={styles.description}>{tournamentDescription}</p>
            </div>
          ) : null}
        </section>

        {overallSummaryRows.length ? (
          <section className={styles.overallSummaryCard}>
            <div className={styles.overallSummaryHeader}>
              <p className={styles.eyebrow}>Overall Summary</p>
              <h2 className={styles.overallSummaryTitle}>Tournament Honors</h2>
            </div>
            <div className={styles.overallSummaryGrid}>
              {overallSummaryRows.map((row) => (
                <article className={styles.overallSummaryItem} key={row.key}>
                  <p className={styles.overallSummaryLabel}>{row.label}</p>
                  <p className={styles.overallSummaryValue}>{row.value}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
                          <td>{formatSummaryValue(summaryTable.key, row)}</td>
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
