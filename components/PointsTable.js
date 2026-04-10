import styles from "./PointsTable.module.css";

export default function PointsTable({ rows, title = "Group A" }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Position</th>
              <th>Logo</th>
              <th>Team</th>
              <th>Points</th>
              <th>Played</th>
              <th>Won</th>
              <th>Draw</th>
              <th>Lost</th>
              <th>G/D</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team}>
                <td>{row.position}</td>
                <td>
                  {row.logo ? (
                    <img alt={`${row.team} logo`} className={styles.teamLogo} src={row.logo} />
                  ) : (
                    <div aria-hidden="true" className={styles.teamLogoFallback}>
                      {String(row.team || "").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className={styles.team}>{row.team}</td>
                <td className={styles.points}>{row.points}</td>
                <td>{row.played}</td>
                <td>{row.won ?? row.wins ?? 0}</td>
                <td>{row.draw ?? row.draws ?? 0}</td>
                <td>{row.lost ?? row.losses ?? 0}</td>
                <td>{row.goalDifference ?? row.difference ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
