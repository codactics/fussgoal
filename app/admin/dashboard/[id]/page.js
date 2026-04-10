"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../../components/Navbar";
import ManageTournamentDetail from "../../../../components/ManageTournamentDetail";
import styles from "../page.module.css";

export default function AdminManageTournamentPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTournament() {
      try {
        const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
        const sessionResult = await sessionResponse.json();

        if (!sessionResult.authenticated) {
          router.replace("/admin");
          return;
        }

        const tournamentResponse = await fetch(`/api/tournaments/${id}`, {
          cache: "no-store",
        });
        const tournamentResult = await tournamentResponse.json();

        if (!tournamentResponse.ok) {
          setErrorMessage(tournamentResult.message || "Tournament not found.");
          setIsCheckingSession(false);
          return;
        }

        setTournament(tournamentResult.tournament || null);
      } catch {
        setErrorMessage("Unable to load the tournament right now.");
      } finally {
        setIsCheckingSession(false);
      }
    }

    loadTournament();
  }, [id, router]);

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <Navbar />
        <section className={styles.wrapper}>
          <div className={styles.headerCard}>
            <p className={styles.eyebrow}>Manage Tournament</p>
            <h1 className={styles.title}>Loading tournament</h1>
            <p className={styles.text}>Checking admin access and fetching the selected tournament.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.wrapper}>
        <div className={styles.headerCard}>
          <p className={styles.eyebrow}>Manage Tournament</p>
          <h1 className={styles.title}>{tournament?.name || "Tournament Details"}</h1>
          <p className={styles.text}>
            Review the groups, teams, and fixtures for this saved tournament.
          </p>
          <p className={styles.text}>
            <Link href="/admin/dashboard">Back to Admin Dashboard</Link>
          </p>
        </div>

        {errorMessage ? (
          <div className={styles.headerCard}>
            <p className={styles.text}>{errorMessage}</p>
          </div>
        ) : null}

        {tournament ? <ManageTournamentDetail tournament={tournament} /> : null}
      </section>
    </main>
  );
}
