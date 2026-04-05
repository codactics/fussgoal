"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.message || "Admin login failed.");
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setErrorMessage("Unable to connect to admin login right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Admin Access</p>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.text}>
            Sign in with the admin username and password to manage the football scoreboard.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-username">
                Admin Username
              </label>
              <input
                className={styles.input}
                id="admin-username"
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                type="text"
                value={username}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-password">
                Admin Password
              </label>
              <input
                className={styles.input}
                id="admin-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                value={password}
              />
            </div>

            {errorMessage ? (
              <p className={styles.text} role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button className={styles.button} disabled={isSubmitting} type="submit">
              Login to Admin
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
