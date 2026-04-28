"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import siteLogo from "../logo/FussGoal_Logo.png";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  useEffect(() => {
    async function loadAdminSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await response.json();
        setIsAdminAuthenticated(Boolean(result.authenticated));
      } catch {
        setIsAdminAuthenticated(false);
      }
    }

    loadAdminSession();
  }, []);

  async function handleAdminLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } finally {
      setIsAdminMenuOpen(false);
      setIsAdminAuthenticated(false);
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/">
          <div className={styles.logo}>
            <Image alt="FussGoal logo" className={styles.logoImage} priority src={siteLogo} />
          </div>
          <div className={styles.brandText}>
            <p className={styles.label}>Football Platform</p>
            <h2 className={styles.title}>FussGoal</h2>
          </div>
        </Link>

        <div className={`${styles.adminMenu} ${isAdminMenuOpen ? styles.adminMenuOpen : ""}`}>
          <button
            aria-expanded={isAdminMenuOpen}
            aria-label="Toggle admin menu"
            className={styles.adminMenuToggle}
            onClick={() => setIsAdminMenuOpen((current) => !current)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

          {isAdminAuthenticated ? (
            <div className={styles.adminActions}>
              <Link
                className={styles.adminPanelButton}
                href="/admin/dashboard"
                onClick={() => setIsAdminMenuOpen(false)}
              >
                Admin Panel
              </Link>
              <button className={styles.loginButton} onClick={handleAdminLogout} type="button">
                Admin Logout
              </button>
            </div>
          ) : (
            <div className={styles.adminActions}>
              <Link className={styles.loginButton} href="/admin" onClick={() => setIsAdminMenuOpen(false)}>
                Admin Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
