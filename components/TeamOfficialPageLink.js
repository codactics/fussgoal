import Link from "next/link";
import { getKnownTeam } from "./knownTeams";
import styles from "./TeamOfficialPageLink.module.css";

export default function TeamOfficialPageLink({ teamName }) {
  const knownTeam = getKnownTeam(teamName);

  if (!knownTeam) {
    return null;
  }

  return (
    <Link
      aria-label={`Open ${knownTeam.name} official team page`}
      className={styles.link}
      href={knownTeam.pagePath}
      onClick={(event) => event.stopPropagation()}
      title="Official team page"
    >
      ↗
    </Link>
  );
}
