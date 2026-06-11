import styles from "./GroupCard.module.css";
import TeamOfficialPageLink from "./TeamOfficialPageLink";

export default function GroupCard({ group, onTeamSelect }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{group.name}</h3>
      <ul className={styles.list}>
        {group.teams.map((team) => (
          <li className={styles.item} key={typeof team === "string" ? team : team.name}>
            {typeof team === "string" ? (
              team
            ) : (
              <div className={styles.teamRow}>
                {team.logo ? (
                  <img alt={`${team.name} logo`} className={styles.teamLogo} src={team.logo} />
                ) : null}
                {onTeamSelect ? (
                  <button
                    className={styles.teamButton}
                    onClick={() => onTeamSelect(team)}
                    type="button"
                  >
                    {team.name}
                  </button>
                ) : (
                  <span>{team.name}</span>
                )}
                <TeamOfficialPageLink teamName={team.name} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
