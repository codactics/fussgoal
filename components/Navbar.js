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

        {isAdminAuthenticated ? (
          <button className={styles.loginButton} onClick={handleAdminLogout} type="button">
            Admin Logout
          </button>
        ) : (
          <Link className={styles.loginButton} href="/admin">
            Admin Login
          </Link>
        )}
      </div>
    </header>
  );
}
