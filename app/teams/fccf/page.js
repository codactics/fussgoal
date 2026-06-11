import Image from "next/image";
import Navbar from "../../../components/Navbar";
import fccfLogo from "../../../logo/teams/fccf/FC_CODACTICS_FALCONS.png";
import { buildAbsoluteUrl } from "../../../lib/site";
import styles from "./page.module.css";

const teamName = "FC CODACTICS FALCONS (FCCF)";
const pageTitle = `${teamName} Team`;
const pageDescription =
  "FC CODACTICS FALCONS (FCCF) team page on FussGoal with team information, squad details, fixtures, and updates.";

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/teams/fccf",
  },
  openGraph: {
    title: `${pageTitle} | FussGoal`,
    description: pageDescription,
    url: buildAbsoluteUrl("/teams/fccf"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${pageTitle} | FussGoal`,
    description: pageDescription,
  },
};

export default function FccfPage() {
  return (
    <main className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Team Profile</p>
            <h1 className={styles.title}>FC CODACTICS FALCONS</h1>
            <p className={styles.shortName}>FCCF</p>
            <p className={styles.description}>
              A dedicated FussGoal page for FC CODACTICS FALCONS (FCCF) team information, squad
              details, fixtures, and updates.
            </p>
          </div>
          <div className={styles.logoWrap}>
            <Image
              alt="FC CODACTICS FALCONS logo"
              className={styles.teamLogo}
              priority
              src={fccfLogo}
            />
          </div>
        </div>
      </section>

      <section className={styles.content} aria-label="FCCF team details">
        <div className={styles.panel}>
          <h2>Team Details</h2>
          <dl className={styles.detailList}>
            <div>
              <dt>Full name</dt>
              <dd>FC CODACTICS FALCONS</dd>
            </div>
            <div>
              <dt>Abbreviation</dt>
              <dd>FCCF</dd>
            </div>
            <div>
              <dt>Based in</dt>
              <dd>Darmstadt, Germany</dd>
            </div>
            <div>
              <dt>Formed</dt>
              <dd>2026</dd>
            </div>
            <div>
              <dt>Contact email</dt>
              <dd>
                <a href="mailto:codactics+fccf@gmail.com">codactics+fccf@gmail.com</a>
              </dd>
            </div>
            <div>
              <dt>Page URL</dt>
              <dd>
                <a href="https://fussgoal.codactics.com/teams/fccf">
                  fussgoal.codactics.com/teams/fccf
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <h2>Coming Soon</h2>
          <ul className={styles.featureList}>
            <li>Team overview</li>
            <li>Player list</li>
            <li>Fixtures and results</li>
            <li>Photos and club updates</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
