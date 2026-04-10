"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import CreateTournamentWizard from "../../../components/CreateTournamentWizard";
import styles from "./page.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [adminSession, setAdminSession] = useState(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await response.json();

        if (!result.authenticated) {
          router.replace("/admin");
          return;
        }

        setAdminSession(result);
      } catch {
        router.replace("/admin");
        return;
      }

      setIsCheckingSession(false);
    }

    checkSession();
  }, [router]);

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <Navbar />
        <section className={styles.wrapper}>
          <div className={styles.headerCard}>
            <p className={styles.eyebrow}>Admin Dashboard</p>
            <h1 className={styles.title}>Checking access</h1>
            <p className={styles.text}>Verifying the admin session before loading tournaments.</p>
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
          <p className={styles.eyebrow}>Admin Dashboard</p>
          <h1 className={styles.title}>Tournament Control</h1>
          <p className={styles.text}>
            Build new tournaments in setup mode, then switch to manage mode to control launch,
            pause, ending, and saved tournament operations.
          </p>
          {adminSession ? (
            <p className={styles.text}>
              Signed in as {adminSession.username} ({adminSession.isMasterAdmin ? "Master Admin" : "Tournament Admin"}).
            </p>
          ) : null}
        </div>

        <CreateTournamentWizard adminSession={adminSession} />
      </section>
    </main>
  );
}
