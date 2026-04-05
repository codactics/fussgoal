"use client";

import { useState } from "react";
import FixtureCard from "./FixtureCard";
import GroupCard from "./GroupCard";
import PointsTable from "./PointsTable";
import styles from "./TournamentPanels.module.css";

export default function TournamentPanels({ tournament }) {
  const [openPanels, setOpenPanels] = useState([]);
  const panelConfig = [
    tournament.fixtures?.length ? { key: "fixtures", label: "Fixtures" } : null,
    tournament.groups?.length ? { key: "groups", label: "Groups" } : null,
    tournament.pointsTables?.length ? { key: "pointsTable", label: "Points Table" } : null,
  ].filter(Boolean);

  function togglePanel(panelKey) {
    setOpenPanels((currentPanels) => {
      if (currentPanels.includes(panelKey)) {
        return currentPanels.filter((key) => key !== panelKey);
      }

      return [...currentPanels, panelKey];
    });
  }

  function renderPanelContent(panelKey) {
    if (panelKey === "fixtures") {
      return (
        <div className={styles.fixtureGrid}>
          {tournament.fixtures.map((fixture) => (
            <FixtureCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      );
    }

    if (panelKey === "groups") {
      return (
        <div className={styles.groupGrid}>
          {tournament.groups.map((group) => (
            <GroupCard key={group.name} group={group} />
          ))}
        </div>
      );
    }

    return (
      <div className={styles.pointsGrid}>
        {tournament.pointsTables.map((groupTable) => (
          <PointsTable key={groupTable.name} rows={groupTable.rows} title={groupTable.name} />
        ))}
      </div>
    );
  }

  return (
    <section className={styles.section}>
      {panelConfig.length ? (
        <div className={styles.buttonGrid}>
          {panelConfig.map((panel) => {
            const isOpen = openPanels.includes(panel.key);

            return (
              <button
                key={panel.key}
                className={`${styles.toggleButton} ${isOpen ? styles.activeButton : ""}`}
                onClick={() => togglePanel(panel.key)}
                type="button"
              >
                <span>{panel.label}</span>
                <span className={styles.buttonIcon}>{isOpen ? "-" : "+"}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {openPanels.length > 0 ? (
        <div
          className={`${styles.panelGrid} ${
            openPanels.length === 1
              ? styles.oneColumn
              : openPanels.length === 2
                ? styles.twoColumns
                : styles.threeColumns
          }`}
        >
          {openPanels.map((panelKey) => {
            const panel = panelConfig.find((item) => item.key === panelKey);

            return (
              <article className={styles.panelCard} key={panelKey}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>{panel.label}</h3>
                  <button
                    aria-label={`Close ${panel.label}`}
                    className={styles.closeButton}
                    onClick={() => togglePanel(panelKey)}
                    type="button"
                  >
                    -
                  </button>
                </div>
                <div className={styles.panelBody}>{renderPanelContent(panelKey)}</div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
