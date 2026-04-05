import styles from "./SectionContainer.module.css";

export default function SectionContainer({ title, description, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
