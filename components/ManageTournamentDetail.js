"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CreateTournamentWizard.module.css";
import { getStoredImageUrl } from "./launchedTournamentUtils";
import {
  buildTournamentTables,
  buildTeamLogoMap,
  formatMatchClock,
  getFixtureKey,
  getFixturePhaseLabel,
  getFixtureStatusLabel,
  getGroupLabel,
  getMatchClockSeconds,
  getMatchScore,
  getTournamentFixtureSections,
} from "./manageTournamentUtils";

const MAX_SQUAD_ROWS = 30;
const MIN_VISIBLE_ROWS = 5;
const PLAYER_POSITIONS = [
  "Goalkeeper",
  "Center Back",
  "Left Back",
  "Right Back",
  "Sweeper",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Left Midfielder",
  "Right Midfielder",
  "Left Winger",
  "Right Winger",
  "Second Striker",
  "Striker",
  "Forward",
  "Other",
];

function createEmptyPlayerRow() {
  return {
    name: "",
    jerseyNumber: "",
    position: "",
    photo: null,
  };
}

function normalizeSquadPlayers(players) {
  const normalizedPlayers = Array.isArray(players)
    ? players.map((player) => ({
        name: String(player?.name || ""),
        jerseyNumber:
          player?.jerseyNumber === null || player?.jerseyNumber === undefined
            ? ""
            : String(player.jerseyNumber),
        position: String(player?.position || ""),
        photo: player?.photo || null,
      }))
    : [];

  const visibleRows = Math.max(MIN_VISIBLE_ROWS, normalizedPlayers.length || 0);
  const nextRows = normalizedPlayers.slice(0, MAX_SQUAD_ROWS);

  while (nextRows.length < Math.min(MAX_SQUAD_ROWS, visibleRows)) {
    nextRows.push(createEmptyPlayerRow());
  }

  return nextRows;
}

export default function ManageTournamentDetail({ tournament }) {
  const [currentTournament, setCurrentTournament] = useState(tournament);
  const [activeTeam, setActiveTeam] = useState(null);
  const [isKnockoutModalOpen, setIsKnockoutModalOpen] = useState(false);
  const [knockoutMatchForm, setKnockoutMatchForm] = useState({
    title: "",
    home: "",
    away: "",
    includeInTable: false,
  });
  const [isSavingKnockoutMatch, setIsSavingKnockoutMatch] = useState(false);
  const [knockoutMessage, setKnockoutMessage] = useState("");
  const [squadRows, setSquadRows] = useState(() => normalizeSquadPlayers([]));
  const [squadStage, setSquadStage] = useState("players");
  const [captainSelection, setCaptainSelection] = useState({
    captain: "",
    viceCaptain1: "",
    viceCaptain2: "",
    viceCaptain3: "",
  });
  const [isSavingSquad, setIsSavingSquad] = useState(false);
  const [isUploadingPlayerPhoto, setIsUploadingPlayerPhoto] = useState(false);
  const [squadMessage, setSquadMessage] = useState("");
  const [timerNow, setTimerNow] = useState(Date.now());

  useEffect(() => {
    setCurrentTournament(tournament);
  }, [tournament]);

  useEffect(() => {
    if (!currentTournament?.id) {
      return undefined;
    }

    let isMounted = true;
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (response.ok && isMounted && result.tournament) {
          setCurrentTournament(result.tournament);
        }
      } catch {}
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentTournament?.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const payload = currentTournament?.data || {};
  const teamLogoMap = useMemo(() => buildTeamLogoMap(payload), [payload]);
  const groupList = Array.isArray(payload.groups) ? payload.groups : [];
  const fixtureSections = getTournamentFixtureSections(currentTournament);
  const squadData = payload.teamSquads || {};
  const matchStatuses = payload.matchStatuses || {};
  const tournamentTables = useMemo(
    () => buildTournamentTables(currentTournament),
    [currentTournament]
  );

  function getTeamSquadRecord(teamName) {
    const record = squadData?.[teamName];

    return {
      players: Array.isArray(record?.players) ? record.players : [],
      captain: String(record?.captain || ""),
      viceCaptain1: String(record?.viceCaptain1 || ""),
      viceCaptain2: String(record?.viceCaptain2 || ""),
      viceCaptain3: String(record?.viceCaptain3 || ""),
    };
  }

  function openSquadModal(teamName) {
    const teamRecord = getTeamSquadRecord(teamName);
    setActiveTeam(teamName);
    setSquadRows(normalizeSquadPlayers(teamRecord.players));
    setCaptainSelection({
      captain: teamRecord.captain,
      viceCaptain1: teamRecord.viceCaptain1,
      viceCaptain2: teamRecord.viceCaptain2,
      viceCaptain3: teamRecord.viceCaptain3,
    });
    setSquadStage(teamRecord.players.length ? "leaders" : "players");
    setSquadMessage("");
  }

  function closeSquadModal() {
    setActiveTeam(null);
    setSquadRows(normalizeSquadPlayers([]));
    setCaptainSelection({
      captain: "",
      viceCaptain1: "",
      viceCaptain2: "",
      viceCaptain3: "",
    });
    setSquadStage("players");
    setSquadMessage("");
    setIsUploadingPlayerPhoto(false);
  }

  function openKnockoutModal() {
    setKnockoutMatchForm({
      title: "",
      home: "",
      away: "",
      includeInTable: false,
    });
    setKnockoutMessage("");
    setIsKnockoutModalOpen(true);
  }

  function closeKnockoutModal() {
    setIsKnockoutModalOpen(false);
    setKnockoutMatchForm({
      title: "",
      home: "",
      away: "",
      includeInTable: false,
    });
    setKnockoutMessage("");
  }

  function updateSquadRow(rowIndex, field, value) {
    setSquadRows((currentRows) =>
      currentRows.map((row, currentIndex) =>
        currentIndex === rowIndex ? { ...row, [field]: value } : row
      )
    );
  }

  function addSquadRow() {
    setSquadRows((currentRows) => {
      if (currentRows.length >= MAX_SQUAD_ROWS) {
        return currentRows;
      }

      return [...currentRows, createEmptyPlayerRow()];
    });
  }

  async function uploadPlayerPhoto(rowIndex, file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "player");

    setIsUploadingPlayerPhoto(true);
    setSquadMessage(`Uploading ${file.name}...`);

    try {
      const response = await fetch("/api/uploads/logo", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to upload the player photo.");
      }

      updateSquadRow(rowIndex, "photo", result.image || null);
      setSquadMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setSquadMessage(error.message);
    } finally {
      setIsUploadingPlayerPhoto(false);
    }
  }

  function getPreparedPlayers() {
    return squadRows
      .map((row) => ({
        name: row.name.trim(),
        jerseyNumber: row.jerseyNumber === "" ? "" : row.jerseyNumber.trim(),
        position: row.position,
        photo: row.photo || null,
      }))
      .filter((row) => row.name);
  }

  function persistTournamentRecord(nextData) {
    setCurrentTournament((current) => ({
      ...current,
      data: nextData,
    }));
  }

  async function saveTournamentData(nextData, successMessage) {
    if (!currentTournament) {
      return false;
    }

    setIsSavingSquad(true);
    setSquadMessage("");

    try {
      const nextTournament = {
        ...currentTournament,
        data: nextData,
      };

      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save squad right now.");
      }

      persistTournamentRecord(result.tournament.data || nextData);
      setSquadMessage(successMessage);
      return true;
    } catch (error) {
      setSquadMessage(error.message);
      return false;
    } finally {
      setIsSavingSquad(false);
    }
  }

  async function handleSaveKnockoutMatch() {
    const title = knockoutMatchForm.title.trim();
    const home = knockoutMatchForm.home.trim();
    const away = knockoutMatchForm.away.trim();

    if (!title) {
      setKnockoutMessage("Match name is required.");
      return;
    }

    if (!home || !away) {
      setKnockoutMessage("Select both teams for the knockout match.");
      return;
    }

    if (home === away) {
      setKnockoutMessage("Choose two different teams.");
      return;
    }

    if (!currentTournament) {
      return;
    }

    setIsSavingKnockoutMatch(true);
    setKnockoutMessage("");

    try {
      const nextKnockoutMatches = [
        ...(Array.isArray(payload.knockoutMatches) ? payload.knockoutMatches : []),
        {
          title,
          home,
          away,
          includeInTable: Boolean(knockoutMatchForm.includeInTable),
          createdAt: new Date().toISOString(),
        },
      ];

      const nextTournament = {
        ...currentTournament,
        data: {
          ...payload,
          knockoutMatches: nextKnockoutMatches,
        },
      };

      const response = await fetch(`/api/tournaments/${currentTournament.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextTournament),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create the knockout match.");
      }

      setCurrentTournament(result.tournament || nextTournament);
      closeKnockoutModal();
    } catch (error) {
      setKnockoutMessage(error.message || "Unable to create the knockout match.");
    } finally {
      setIsSavingKnockoutMatch(false);
    }
  }

  async function handleSaveSquadPlayers() {
    const preparedPlayers = getPreparedPlayers();

    if (!preparedPlayers.length) {
      setSquadMessage("Enter at least one player name before saving the squad.");
      return;
    }

    const hasEmptyNamedRow = squadRows.some((row) => row.name.trim() === "" && row.jerseyNumber !== "");
    if (hasEmptyNamedRow) {
      setSquadMessage("Player name is required for any row that has other details.");
      return;
    }

    const duplicateNames = new Set();
    for (const player of preparedPlayers) {
      const normalizedName = player.name.toLowerCase();
      if (duplicateNames.has(normalizedName)) {
        setSquadMessage("Player names must be unique within the squad.");
        return;
      }
      duplicateNames.add(normalizedName);

      if (player.jerseyNumber !== "" && !/^\d+$/.test(player.jerseyNumber)) {
        setSquadMessage("Jersey number can contain only digits.");
        return;
      }
    }

    const nextData = {
      ...payload,
      teamSquads: {
        ...(payload.teamSquads || {}),
        [activeTeam]: {
          ...(payload.teamSquads?.[activeTeam] || {}),
          players: preparedPlayers.map((player) => ({
            ...player,
            jerseyNumber: player.jerseyNumber === "" ? null : Number(player.jerseyNumber),
          })),
        },
      },
    };

    const saved = await saveTournamentData(
      nextData,
      `Squad saved for ${activeTeam}. Now choose captain and vice captains.`
    );

    if (saved) {
      setSquadStage("leaders");
    }
  }

  function getEligiblePlayerNames(excludedNames) {
    const preparedPlayers = getPreparedPlayers();

    return preparedPlayers
      .map((player) => player.name)
      .filter((playerName) => !excludedNames.includes(playerName));
  }

  function getLeadershipOptions(fieldName) {
    const allPlayerNames = getPreparedPlayers().map((player) => player.name);
    const currentValue = captainSelection[fieldName];
    const selectedElsewhere = new Set(
      Object.entries(captainSelection)
        .filter(([key, value]) => key !== fieldName && value)
        .map(([, value]) => value)
    );

    return allPlayerNames.filter(
      (playerName) => playerName === currentValue || !selectedElsewhere.has(playerName)
    );
  }

  function getKnockoutTeamOptions(fieldName) {
    const currentValue = knockoutMatchForm[fieldName];
    const otherFieldName = fieldName === "home" ? "away" : "home";
    const otherSelectedValue = knockoutMatchForm[otherFieldName];

    return groupList.map((group, groupIndex) => ({
      label: getGroupLabel(groupIndex),
      teams: group.filter((team) => team === currentValue || team !== otherSelectedValue),
    }));
  }

  async function handleSaveLeadership() {
    const preparedPlayers = getPreparedPlayers();
    const playerNames = preparedPlayers.map((player) => player.name);

    if (!captainSelection.captain) {
      setSquadMessage("Captain is required.");
      return;
    }

    if (!playerNames.includes(captainSelection.captain)) {
      setSquadMessage("Captain must be selected from the saved squad.");
      return;
    }

    const selections = [
      captainSelection.captain,
      captainSelection.viceCaptain1,
      captainSelection.viceCaptain2,
      captainSelection.viceCaptain3,
    ].filter(Boolean);

    if (new Set(selections).size !== selections.length) {
      setSquadMessage("Captain and vice captains must all be different players.");
      return;
    }

    const nextData = {
      ...payload,
      teamSquads: {
        ...(payload.teamSquads || {}),
        [activeTeam]: {
          ...(payload.teamSquads?.[activeTeam] || {}),
          players: preparedPlayers.map((player) => ({
            ...player,
            jerseyNumber: player.jerseyNumber === "" ? null : Number(player.jerseyNumber),
          })),
          captain: captainSelection.captain,
          viceCaptain1: captainSelection.viceCaptain1,
          viceCaptain2: captainSelection.viceCaptain2,
          viceCaptain3: captainSelection.viceCaptain3,
        },
      },
    };

    const saved = await saveTournamentData(nextData, `${activeTeam} squad leadership saved.`);

    if (saved) {
      closeSquadModal();
    }
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <div className={styles.manageDetailSection}>
      <div className={styles.manageDetailHeader}>
        <div>
          <p className={styles.eyebrowLabel}>Selected Tournament</p>
          <h3 className={styles.manageDetailTitle}>{currentTournament.name}</h3>
        </div>
        <p className={styles.resultMeta}>
          Type: {currentTournament.tournamentType === "league" ? "League" : "Group"}
        </p>
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 1: Groups & Teams</h4>
        {groupList.length ? (
          <div className={styles.manageGroupGrid}>
            {groupList.map((group, index) => (
              <div className={styles.manageGroupCard} key={`${currentTournament.id}-group-${index + 1}`}>
                <h5 className={styles.manageGroupTitle}>{getGroupLabel(index)}</h5>
                <div className={styles.manageTeamList}>
                  {group.map((team) => (
                    <button
                      className={styles.manageTeamButton}
                      key={`${currentTournament.id}-${team}`}
                      onClick={() => openSquadModal(team)}
                      type="button"
                    >
                      {teamLogoMap[team] ? (
                        <img
                          alt={`${team} logo`}
                          className={styles.manageTeamLogo}
                          src={teamLogoMap[team]}
                        />
                      ) : (
                        <div className={styles.manageTeamLogoFallback}>{team.slice(0, 1)}</div>
                      )}
                      <span className={styles.manageTeamName}>{team}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No groups available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 2: Match Fixtures</h4>
        {fixtureSections.length ? (
          <div className={styles.manageFixturesStack}>
            {fixtureSections.map((section, sectionIndex) => (
              <div className={styles.manageFixtureCard} key={`${currentTournament.id}-${section.title}`}>
                <h5 className={styles.manageFixtureTitle}>{section.title}</h5>
                <div className={styles.fixtureRowList}>
                  {section.matches.length ? (
                    section.matches.map((match) => {
                      const fixtureKey = getFixtureKey(
                        sectionIndex,
                        match.roundIndex,
                        match.matchIndex
                      );
                      const matchStatus = matchStatuses[fixtureKey];
                      const statusLabel = getFixtureStatusLabel(matchStatus);
                      const phaseLabel = getFixturePhaseLabel(matchStatus);
                      const score = getMatchScore(matchStatus);
                      const clockText = matchStatus
                        ? formatMatchClock(getMatchClockSeconds(matchStatus, timerNow))
                        : "";
                      const hasScheduledDate = Boolean(match.date && match.date !== "TBD");
                      const hasScheduledTime = Boolean(match.time && match.time !== "TBD");
                      const hasSchedule = hasScheduledDate || hasScheduledTime;
                      const displayStatusLabel = statusLabel || (hasSchedule ? "Upcoming" : "");
                      const scheduleText = hasSchedule
                        ? [hasScheduledDate ? match.date : "", hasScheduledTime ? match.time : ""]
                            .filter(Boolean)
                            .join(" | ")
                        : "";

                      return (
                        <Link
                          className={styles.fixtureRowLink}
                          href={`/admin/dashboard/${currentTournament.id}/fixture/${sectionIndex}/${match.roundIndex}/${match.matchIndex}`}
                          key={`${currentTournament.id}-${section.title}-${match.roundIndex}-${match.matchIndex}-${match.home}-${match.away}`}
                        >
                          <span className={styles.fixtureRowTeam}>{match.home}</span>
                          <span className={styles.fixtureRowCenter}>
                            <span className={styles.fixtureRowVs}>vs</span>
                            {matchStatus || hasSchedule ? (
                              <span className={styles.fixtureRowMeta}>
                                {displayStatusLabel ? (
                                  <span
                                    className={`${styles.fixtureStatusBadge} ${
                                      displayStatusLabel === "Live"
                                        ? styles.fixtureStatusLive
                                        : displayStatusLabel === "HT"
                                          ? styles.fixtureStatusHalftime
                                          : displayStatusLabel === "Upcoming"
                                            ? styles.fixtureStatusUpcoming
                                            : styles.fixtureStatusEnded
                                    }`}
                                  >
                                    {displayStatusLabel}
                                  </span>
                                ) : null}
                                {matchStatus ? (
                                  <span className={styles.fixtureLiveScore}>
                                    {score.home}:{score.away}
                                  </span>
                                ) : null}
                                {matchStatus && clockText ? (
                                  <span className={styles.fixtureLiveClock}>{clockText}</span>
                                ) : null}
                                {matchStatus && phaseLabel ? (
                                  <span className={styles.fixtureLivePhase}>{phaseLabel}</span>
                                ) : null}
                                {!matchStatus && scheduleText ? (
                                  <span className={styles.fixtureScheduleMeta}>{scheduleText}</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                          <span className={styles.fixtureRowTeamRight}>{match.away}</span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className={styles.savedEmpty}>No fixtures in this section.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No fixtures available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <h4 className={styles.manageSectionTitle}>Section 3: Tournament Table</h4>
        {tournamentTables.length ? (
          <div className={styles.manageFixturesStack}>
            {tournamentTables.map((groupTable) => (
              <div className={styles.manageFixtureCard} key={`${currentTournament.id}-${groupTable.title}-table`}>
                <h5 className={styles.manageFixtureTitle}>{groupTable.title}</h5>
                <div className={styles.tournamentTableWrap}>
                  <table className={styles.tournamentTable}>
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Points</th>
                        <th>Played</th>
                        <th>W</th>
                        <th>L</th>
                        <th>D</th>
                        <th>Scored</th>
                        <th>Contained</th>
                        <th>GD</th>
                        <th>Yellow</th>
                        <th>Red</th>
                        <th>Penalty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupTable.rows.map((row) => (
                        <tr key={`${groupTable.title}-${row.team}`}>
                          <td>{row.team}</td>
                          <td>{row.points}</td>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          <td>{row.losses}</td>
                          <td>{row.draws}</td>
                          <td>{row.scored}</td>
                          <td>{row.contained}</td>
                          <td>{row.difference}</td>
                          <td>{row.yellow}</td>
                          <td>{row.red}</td>
                          <td>{row.penalty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.savedEmpty}>No group table is available for this tournament yet.</div>
        )}
      </div>

      <div className={styles.manageSectionCard}>
        <div className={styles.squadModalActions}>
          <h4 className={styles.manageSectionTitle}>Section 4: Knock Out</h4>
          <button className={styles.primaryButton} onClick={openKnockoutModal} type="button">
            Create Matches
          </button>
        </div>
        <p className={styles.passwordText}>
          Create custom knockout matches like Quarter Final, Semi Final, or Final. Saved matches
          appear automatically inside Section 2: Match Fixtures.
        </p>
      </div>

      {activeTeam ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.squadModalCard}>
            <div className={styles.squadModalHeader}>
              <div className={styles.squadModalTitleBlock}>
                {teamLogoMap[activeTeam] ? (
                  <img
                    alt={`${activeTeam} logo`}
                    className={styles.squadTeamLogo}
                    src={teamLogoMap[activeTeam]}
                  />
                ) : (
                  <div className={styles.manageTeamLogoFallback}>{activeTeam.slice(0, 1)}</div>
                )}
                <div>
                  <h3 className={styles.passwordTitle}>Enter full squad of {activeTeam}</h3>
                  <p className={styles.passwordText}>
                    Fill player details below. Player name is mandatory. You can add up to 30 rows.
                  </p>
                </div>
              </div>
              <button className={styles.secondaryButton} onClick={closeSquadModal} type="button">
                Close
              </button>
            </div>

            <div className={styles.squadTableWrap}>
              <table className={styles.squadTable}>
                <thead>
                  <tr>
                    <th>Player Name</th>
                    <th>Jersey Number</th>
                    <th>Position</th>
                    <th>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {squadRows.map((row, rowIndex) => (
                    <tr key={`${activeTeam}-row-${rowIndex + 1}`}>
                      <td>
                        <input
                          className={styles.input}
                          onChange={(event) => updateSquadRow(rowIndex, "name", event.target.value)}
                          placeholder="Player name"
                          type="text"
                          value={row.name}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          onChange={(event) =>
                            updateSquadRow(
                              rowIndex,
                              "jerseyNumber",
                              event.target.value.replace(/[^\d]/g, "")
                            )
                          }
                          placeholder="Optional"
                          type="text"
                          value={row.jerseyNumber}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          onChange={(event) => updateSquadRow(rowIndex, "position", event.target.value)}
                          value={row.position}
                        >
                          <option value="">Select position</option>
                          {PLAYER_POSITIONS.map((position) => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className={styles.squadPhotoCell}>
                          <input
                            accept="image/*"
                            className={styles.input}
                            disabled={isUploadingPlayerPhoto}
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                uploadPlayerPhoto(rowIndex, file);
                              }

                              event.target.value = "";
                            }}
                            type="file"
                          />
                          {row.photo ? (
                            <img
                              alt={row.name ? `${row.name} photo` : "Player photo"}
                              className={styles.squadPlayerPhoto}
                              src={getStoredImageUrl(row.photo)}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.squadModalActions}>
              <p className={styles.resultMeta}>Rows: {squadRows.length} / {MAX_SQUAD_ROWS}</p>
              <button
                className={styles.secondaryButton}
                disabled={squadRows.length >= MAX_SQUAD_ROWS}
                onClick={addSquadRow}
                type="button"
              >
                Add Row
              </button>
            </div>

            {squadStage === "leaders" ? (
              <div className={styles.squadLeadershipSection}>
                <h4 className={styles.manageSectionTitle}>Leadership</h4>
                <div className={styles.squadLeadershipGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="captain">
                      Captain
                    </label>
                    <select
                      className={styles.select}
                      id="captain"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          captain: event.target.value,
                          viceCaptain1:
                            event.target.value === current.viceCaptain1 ? "" : current.viceCaptain1,
                          viceCaptain2:
                            event.target.value === current.viceCaptain2 ? "" : current.viceCaptain2,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.captain}
                    >
                      <option value="">Select captain</option>
                      {getLeadershipOptions("captain").map((playerName) => (
                        <option key={`captain-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-1">
                      Vice Captain 1
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-1"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain1: event.target.value,
                          viceCaptain2:
                            event.target.value === current.viceCaptain2 ? "" : current.viceCaptain2,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.viceCaptain1}
                    >
                      <option value="">Select vice captain 1</option>
                      {getLeadershipOptions("viceCaptain1").map((playerName) => (
                        <option key={`vc1-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-2">
                      Vice Captain 2
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-2"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain2: event.target.value,
                          viceCaptain3:
                            event.target.value === current.viceCaptain3 ? "" : current.viceCaptain3,
                        }))
                      }
                      value={captainSelection.viceCaptain2}
                    >
                      <option value="">Select vice captain 2</option>
                      {getLeadershipOptions("viceCaptain2").map((playerName) => (
                        <option key={`vc2-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="vice-captain-3">
                      Vice Captain 3
                    </label>
                    <select
                      className={styles.select}
                      id="vice-captain-3"
                      onChange={(event) =>
                        setCaptainSelection((current) => ({
                          ...current,
                          viceCaptain3: event.target.value,
                        }))
                      }
                      value={captainSelection.viceCaptain3}
                    >
                      <option value="">Select vice captain 3</option>
                      {getLeadershipOptions("viceCaptain3").map((playerName) => (
                        <option key={`vc3-${playerName}`} value={playerName}>
                          {playerName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {squadMessage ? <p className={styles.status}>{squadMessage}</p> : null}

            <div className={styles.passwordActions}>
              {squadStage === "players" ? (
                <button
                  className={styles.primaryButton}
                  disabled={isSavingSquad || isUploadingPlayerPhoto}
                  onClick={handleSaveSquadPlayers}
                  type="button"
                >
                  {isSavingSquad ? "Saving..." : "Save Squad"}
                </button>
              ) : (
                <>
                  <button
                    className={styles.secondaryButton}
                    disabled={isSavingSquad}
                    onClick={() => setSquadStage("players")}
                    type="button"
                  >
                    Back to Squad
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={isSavingSquad}
                    onClick={handleSaveLeadership}
                    type="button"
                  >
                    {isSavingSquad ? "Saving..." : "Save Leadership"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isKnockoutModalOpen ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.squadModalCard}>
            <div className={styles.squadModalHeader}>
              <div>
                <h3 className={styles.passwordTitle}>Create knockout match</h3>
                <p className={styles.passwordText}>
                  Add a custom match name and choose any two teams from the group stage.
                </p>
              </div>
              <button className={styles.secondaryButton} onClick={closeKnockoutModal} type="button">
                Close
              </button>
            </div>

            <div className={styles.squadLeadershipSection}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="knockout-match-name">
                  Match name
                </label>
                <input
                  className={styles.input}
                  id="knockout-match-name"
                  onChange={(event) =>
                    setKnockoutMatchForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Semi Final"
                  type="text"
                  value={knockoutMatchForm.title}
                />
              </div>

              <div className={styles.squadLeadershipGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="knockout-home-team">
                    Team 1
                  </label>
                  <select
                    className={styles.select}
                    id="knockout-home-team"
                    onChange={(event) =>
                      setKnockoutMatchForm((current) => ({
                        ...current,
                        home: event.target.value,
                      }))
                    }
                    value={knockoutMatchForm.home}
                  >
                    <option value="">Select team</option>
                    {getKnockoutTeamOptions("home").map((group, groupIndex) => (
                      <optgroup key={`knockout-home-group-${groupIndex + 1}`} label={group.label}>
                        {group.teams.map((team) => (
                          <option key={`knockout-home-${team}`} value={team}>
                            {team}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="knockout-away-team">
                    Team 2
                  </label>
                  <select
                    className={styles.select}
                    id="knockout-away-team"
                    onChange={(event) =>
                      setKnockoutMatchForm((current) => ({
                        ...current,
                        away: event.target.value,
                      }))
                    }
                    value={knockoutMatchForm.away}
                  >
                    <option value="">Select team</option>
                    {getKnockoutTeamOptions("away").map((group, groupIndex) => (
                      <optgroup key={`knockout-away-group-${groupIndex + 1}`} label={group.label}>
                        {group.teams.map((team) => (
                          <option key={`knockout-away-${team}`} value={team}>
                            {team}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <label className={styles.knockoutCheckbox}>
                <input
                  checked={knockoutMatchForm.includeInTable}
                  onChange={(event) =>
                    setKnockoutMatchForm((current) => ({
                      ...current,
                      includeInTable: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  Add this match result to Section 3: Tournament Table
                </span>
              </label>

              <div className={styles.knockoutTeamList}>
                {tournamentTables.map((groupTable, groupIndex) => (
                  <div className={styles.knockoutTeamGroup} key={`knockout-group-preview-${groupIndex + 1}`}>
                    <p className={styles.knockoutTeamGroupTitle}>{groupTable.title}</p>
                    {groupTable.rows.length ? (
                      <div className={styles.knockoutTeamTable}>
                        <div className={styles.knockoutTeamTableHead}>
                          <span>Team</span>
                          <span>Pts</span>
                        </div>
                        {groupTable.rows.map((row) => (
                          <div
                            className={styles.knockoutTeamTableRow}
                            key={`knockout-preview-${groupIndex + 1}-${row.team}`}
                          >
                            <span className={styles.knockoutTeamName}>{row.team}</span>
                            <span className={styles.knockoutTeamPoints}>{row.points}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.knockoutTeamName}>No table data yet.</p>
                    )}
                  </div>
                ))}
              </div>

              {knockoutMessage ? <p className={styles.status}>{knockoutMessage}</p> : null}

              <div className={styles.squadModalActions}>
                <div />
                <button
                  className={styles.primaryButton}
                  disabled={isSavingKnockoutMatch}
                  onClick={handleSaveKnockoutMatch}
                  type="button"
                >
                  {isSavingKnockoutMatch ? "Saving..." : "Save Match"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
