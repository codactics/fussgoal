import Link from "next/link";
import { getKnownTeam } from "./knownTeams";

export default function TeamPageLink({ children, className, teamName }) {
  const knownTeam = getKnownTeam(teamName);

  if (!knownTeam) {
    return children;
  }

  return (
    <Link
      className={className}
      href={knownTeam.pagePath}
      onClick={(event) => event.stopPropagation()}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {children}
    </Link>
  );
}
