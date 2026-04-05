import styles from "./GroupCard.module.css";

export default function GroupCard({ group }) {
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
                <span>{team.name}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
