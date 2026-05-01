import TeamSquadCard from "./TeamSquadCard";
import styles from "./TeamSquadModal.module.css";

export default function TeamSquadModal({ logo = "", onClose, squad, teamName }) {
  return (
    <div
      aria-modal="true"
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.actions}>
          <button className={styles.closeButton} onClick={onClose} type="button">
            Close
          </button>
        </div>
        <TeamSquadCard logo={logo} squad={squad} teamName={teamName} />
      </div>
    </div>
  );
}
