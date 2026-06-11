export const KNOWN_TEAMS = [
  {
    aliases: [
      "FC CODACTICS FALCON",
      "FC CODACTICS FALCONS",
      "FC CODACTICS FALCONS (FCCF)",
      "FCCF",
    ],
    logo: "/logo/teams/fccf/FC_CODACTICS_FALCONS.png",
    name: "FC CODACTICS FALCONS",
    pagePath: "/teams/fccf",
  },
];

export function getKnownTeam(teamName) {
  const normalizedName = String(teamName || "").trim().toUpperCase();

  return (
    KNOWN_TEAMS.find((team) =>
      team.aliases.some((alias) => alias.toUpperCase() === normalizedName)
    ) || null
  );
}
