"use client";

import { use, useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import SectionContainer from "../../../components/SectionContainer";
import MatchCard from "../../../components/MatchCard";
import TournamentPanels from "../../../components/TournamentPanels";
import { getTournamentBySlug } from "../../../data/tournaments";
import { getMatchesByTournamentSlug } from "../../../data/matches";
import {
  getStoredImageUrl,
  normalizeSavedTournament,
} from "../../../components/launchedTournamentUtils";
import styles from "./page.module.css";

const SAVED_TOURNAMENTS_EVENT = "saved-tournaments-updated";

export default function TournamentPage({ params }) {
  const { slug } = use(params);
  const staticTournament = getTournamentBySlug(slug);
  const staticMatches = getMatchesByTournamentSlug(slug);
  const [launchedTournament, setLaunchedTournament] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

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

    loadLaunchedTournament();
    window.addEventListener(SAVED_TOURNAMENTS_EVENT, loadLaunchedTournament);

    return () => {
      window.removeEventListener(SAVED_TOURNAMENTS_EVENT, loadLaunchedTournament);
    };
  }, [slug]);

  const tournament = useMemo(
    () => (slug.startsWith("launched-") ? launchedTournament : staticTournament),
    [launchedTournament, slug, staticTournament]
  );

  const tournamentMatches = slug.startsWith("launched-") ? [] : staticMatches;
  const tournamentLogoUrl = getStoredImageUrl(tournament?.tournamentLogo);

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
          <div className={styles.summaryWide}>
            <p className={styles.label}>Description</p>
            <p className={styles.description}>{tournament.description}</p>
          </div>
        </section>

        <TournamentPanels tournament={tournament} />

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
      </div>
    </main>
  );
}
