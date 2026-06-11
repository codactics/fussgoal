import styles from "./TeamSquadCard.module.css";
import TeamOfficialPageLink from "./TeamOfficialPageLink";

function getLeadershipLabel(playerName, squad) {
  const name = String(playerName || "").trim();

  if (!name || !squad) {
    return "";
  }

  if (String(squad.captain || "").trim() === name) {
    return "Captain";
  }

  if (
    [squad.viceCaptain1, squad.viceCaptain2, squad.viceCaptain3]
      .map((value) => String(value || "").trim())
      .includes(name)
  ) {
    return "Vice Captain";
  }

  return "";
}

export default function TeamSquadCard({ logo = "", squad, teamName }) {
  const players = Array.isArray(squad?.players)
    ? squad.players.filter((player) => String(player?.name || "").trim())
    : [];

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        {logo ? <img alt={`${teamName} logo`} className={styles.logo} src={logo} /> : null}
        <div>
          <p className={styles.kicker}>Full Squad</p>
          <h3 className={styles.title}>
            {teamName} <TeamOfficialPageLink teamName={teamName} />
          </h3>
        </div>
      </div>

      {players.length ? (
        <div className={styles.list}>
          {players.map((player, index) => {
            const playerName = String(player.name || "").trim();
            const leadershipLabel = getLeadershipLabel(playerName, squad);
            const position = String(player.position || "").trim();
            const jerseyNumber =
              player.jerseyNumber === null || player.jerseyNumber === undefined
                ? ""
                : String(player.jerseyNumber).trim();

            return (
              <div className={styles.row} key={`${teamName}-${playerName}-${index}`}>
                <div className={styles.playerMain}>
                  {jerseyNumber ? <span className={styles.jersey}>#{jerseyNumber}</span> : null}
                  <span className={styles.playerName}>{playerName}</span>
                </div>
                <div className={styles.meta}>
                  {leadershipLabel ? <span className={styles.badge}>{leadershipLabel}</span> : null}
                  {position ? <span className={styles.position}>{position}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>No squad saved yet.</p>
      )}
    </section>
  );
}
