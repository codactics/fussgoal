"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./LaunchedTournamentList.module.css";
import {
  createLaunchedTournamentSlug,
  getStoredImageUrl,
  getTournamentDisplayStatus,
} from "./launchedTournamentUtils";

const SAVED_TOURNAMENTS_EVENT = "saved-tournaments-updated";

function getTournamentBucket(endDate) {
  return getTournamentDisplayStatus("", endDate) === "Past" ? "past" : "ongoing";
}

function renderTournamentCard(tournament) {
  const statusLabel = tournament.bucket === "ongoing" ? "Running" : "Ended";

  const tournamentLogoUrl = getStoredImageUrl(tournament.data?.tournamentLogo);

  return (
    <Link className={styles.card} href={`/tournament/${tournament.slug}`} key={tournament.id}>
      <div className={styles.cardTop}>
        <div className={styles.titleRow}>
          {tournamentLogoUrl ? (
            <img
              alt={`${tournament.name} logo`}
              className={styles.tournamentLogo}
              src={tournamentLogoUrl}
            />
          ) : null}
          <h3 className={styles.name}>{tournament.name}</h3>
        </div>
        <span
          className={`${styles.statusPill} ${
            tournament.bucket === "ongoing" ? styles.statusLive : styles.statusPast
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaBlock}>
          <p className={styles.label}>Start</p>
          <p className={styles.value}>{tournament.startDate || "N/A"}</p>
        </div>

        <div className={styles.metaBlock}>
          <p className={styles.label}>End</p>
          <p className={styles.value}>{tournament.endDate || "N/A"}</p>
        </div>

        <div className={styles.metaBlock}>
          <p className={styles.label}>Format</p>
          <p className={styles.metaValue}>
            {tournament.tournamentType === "league" ? "League" : "Group"}
          </p>
        </div>

        <div className={styles.metaBlock}>
          <p className={styles.label}>Teams</p>
          <p className={styles.metaValue}>{tournament.teamCount}</p>
        </div>
      </div>
    </Link>
  );
}

export default function LaunchedTournamentList() {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    async function loadTournaments() {
      try {
        const response = await fetch("/api/tournaments?launchedOnly=true", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          setTournaments([]);
          return;
        }

        const launchedTournaments = (result.tournaments || [])
          .filter((tournament) => tournament.launched)
          .map((tournament) => ({
            ...tournament,
            slug: createLaunchedTournamentSlug(tournament.id),
            bucket: getTournamentBucket(tournament.endDate),
          }));
        setTournaments(launchedTournaments);
      } catch {
        setTournaments([]);
      }
    }

    loadTournaments();
    window.addEventListener(SAVED_TOURNAMENTS_EVENT, loadTournaments);

    return () => {
      window.removeEventListener(SAVED_TOURNAMENTS_EVENT, loadTournaments);
    };
  }, []);

  const ongoingTournaments = tournaments.filter((tournament) => tournament.bucket === "ongoing");
  const pastTournaments = tournaments.filter((tournament) => tournament.bucket === "past");

  if (!ongoingTournaments.length && !pastTournaments.length) {
    return null;
  }

  return (
    <div className={styles.stack}>
      {ongoingTournaments.length ? (
        <section className={styles.section}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Visible Now</p>
              <h2 className={styles.heading}>Ongoing Tournaments</h2>
            </div>
            <p className={styles.description}>
              Tournaments currently launched by admin and available to normal users.
            </p>
          </div>

          <div className={styles.grid}>{ongoingTournaments.map(renderTournamentCard)}</div>
        </section>
      ) : null}

      {pastTournaments.length ? (
        <section className={styles.section}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Archive</p>
              <h2 className={styles.heading}>Past Tournaments</h2>
            </div>
            <p className={styles.description}>
              Tournaments that were launched before and have already been ended.
            </p>
          </div>

          <div className={styles.grid}>{pastTournaments.map(renderTournamentCard)}</div>
        </section>
      ) : null}
    </div>
  );
}
