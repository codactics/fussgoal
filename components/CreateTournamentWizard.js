"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./CreateTournamentWizard.module.css";
import { getStoredImagePublicId, getStoredImageUrl } from "./launchedTournamentUtils";
import {
  arrangeRoundsNoBackToBack,
  buildCrossGroupFixtures,
  buildGroups,
  generateRoundRobin,
  orderMatchesStrict,
  shuffleArray,
} from "./tournamentUtils";

const initialForm = {
  name: "",
  startDate: "",
  logoName: "",
  logoDataUrl: "",
  logoPublicId: "",
  teamCount: "",
  tournamentType: "",
  groupCount: "",
  minTeamsPerGroup: "",
  maxTeamsPerGroup: "",
};

const initialOptions = {
  assignMode: "auto",
  unevenMode: "balanced",
  roundRobin: "single",
  fixtureScope: "same",
  homeAway: false,
  backToBack: false,
};

const SAVED_TOURNAMENTS_EVENT = "saved-tournaments-updated";

function getGroupLabel(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

function createEmptyRoundSlots(rounds) {
  return rounds.map((matches) => matches.map(() => ({ home: "", away: "" })));
}

function buildManualRoundSlots(teams, roundRobin, homeAway) {
  const { rounds } = generateRoundRobin(teams);
  let slots = createEmptyRoundSlots(rounds);

  if (roundRobin === "double") {
    slots = slots.concat(createEmptyRoundSlots(rounds));
  }

  if (homeAway && roundRobin === "single") {
    slots = slots.concat(createEmptyRoundSlots(rounds));
  }

  return slots;
}

function getTournamentPhase(startDate, endDate) {
  const today = new Date();
  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

  if (end && end < currentDate) {
    return "past";
  }

  if (start && start > currentDate) {
    return "upcoming";
  }

  return "ongoing";
}

function getAdminTournamentPhase({ startDate, endDate, launched = false, paused = false }) {
  const basePhase = getTournamentPhase(startDate, endDate);

  if (basePhase === "past") {
    return "past";
  }

  if (launched && !paused) {
    return "ongoing";
  }

  return basePhase;
}

export default function CreateTournamentWizard({ adminSession = null }) {
  const [activeTab, setActiveTab] = useState("setup");
  const [isStarted, setIsStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [teamEntries, setTeamEntries] = useState([]);
  const [options, setOptions] = useState(initialOptions);
  const [groups, setGroups] = useState([]);
  const [fixtures, setFixtures] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savedTournaments, setSavedTournaments] = useState([]);
  const [editingTournamentId, setEditingTournamentId] = useState(null);
  const [pendingProtectedAction, setPendingProtectedAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isUploadingTournamentLogo, setIsUploadingTournamentLogo] = useState(false);
  const [uploadingTeamIndex, setUploadingTeamIndex] = useState(null);

  const groupCountValue = Number.parseInt(form.groupCount, 10) || 0;
  const totalSteps = form.tournamentType === "league" ? 3 : 5;
  const isUploadingLogo = isUploadingTournamentLogo || uploadingTeamIndex !== null;

  const namedTeams = teamEntries.map((entry) => entry.name.trim()).filter(Boolean);
  const savedUpcomingTournaments = savedTournaments.filter(
    (tournament) => tournament.phase === "upcoming"
  );
  const savedOngoingTournaments = savedTournaments.filter(
    (tournament) => tournament.phase === "ongoing"
  );
  const savedPastTournaments = savedTournaments.filter(
    (tournament) => tournament.phase === "past"
  );

  useEffect(() => {
    loadSavedTournaments();
  }, []);

  function hydrateTournamentRecord(tournament) {
    const startDate = tournament.startDate || tournament.tournamentDate || "";
    const endDate = tournament.endDate || tournament.tournamentDate || "";

    return {
      ...tournament,
      startDate,
      endDate,
      phase: getAdminTournamentPhase({
        startDate,
        endDate,
        launched: tournament.launched || false,
        paused: tournament.paused || false,
      }),
    };
  }

  async function loadSavedTournaments() {
    try {
      const response = await fetch("/api/tournaments", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setSavedTournaments([]);
        return;
      }

      setSavedTournaments((result.tournaments || []).map(hydrateTournamentRecord));
    } catch {
      setSavedTournaments([]);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateOption(field, value) {
    setOptions((current) => ({ ...current, [field]: value }));
  }

  function updateTeamEntry(index, field, value) {
    setTeamEntries((current) => {
      const previousEntry = current[index];
      const nextEntries = current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      );

      if (field !== "name" || !previousEntry) {
        return nextEntries;
      }

      const previousName = previousEntry.name.trim();
      const nextName = String(value).trim();

      // If a team is renamed, preserve the existing generated structure by
      // rewriting that team name across groups and fixtures.
      if (previousName && nextName && previousName !== nextName) {
        setGroups((currentGroups) =>
          currentGroups.map((group) =>
            group.map((team) => (team === previousName ? nextName : team))
          )
        );

        setFixtures((currentFixtures) => {
          if (!currentFixtures) {
            return currentFixtures;
          }

          if (currentFixtures.scope === "same") {
            return {
              ...currentFixtures,
              groups: currentFixtures.groups.map((group) => ({
                ...group,
                rounds: group.rounds.map((matches) =>
                  matches.map((match) => ({
                    home: match.home === previousName ? nextName : match.home,
                    away: match.away === previousName ? nextName : match.away,
                  }))
                ),
              })),
            };
          }

          if (currentFixtures.scope === "cross") {
            return {
              ...currentFixtures,
              pairs: currentFixtures.pairs.map((pair) => ({
                ...pair,
                matches: pair.matches.map((match) => ({
                  home: match.home === previousName ? nextName : match.home,
                  away: match.away === previousName ? nextName : match.away,
                })),
              })),
            };
          }

          if (currentFixtures.scope === "league") {
            return {
              ...currentFixtures,
              rounds: currentFixtures.rounds.map((matches) =>
                matches.map((match) => ({
                  home: match.home === previousName ? nextName : match.home,
                  away: match.away === previousName ? nextName : match.away,
                }))
              ),
            };
          }

          return currentFixtures;
        });

        setStatusMessage(
          `Team name updated from "${previousName}" to "${nextName}". Existing fixtures were preserved.`
        );
      }

      // Adding or removing a team changes the tournament structure, so the
      // previous groups/fixtures are no longer reliable.
      if ((previousName && !nextName) || (!previousName && nextName)) {
        setGroups([]);
        setFixtures(null);
        setStatusMessage(
          "Team list changed. Please regenerate groups and fixtures before saving."
        );
      }

      return nextEntries;
    });
  }

  async function uploadLogoFile(file, kind) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const response = await fetch("/api/uploads/logo", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to upload the image.");
    }

    return result.image;
  }

  async function handleTeamLogoChange(index, event) {
    const file = event.target.files?.[0];

    if (!file) {
      updateTeamEntry(index, "logoName", "");
      updateTeamEntry(index, "logoDataUrl", "");
      updateTeamEntry(index, "logoPublicId", "");
      return;
    }

    setUploadingTeamIndex(index);
    setStatusMessage(`Uploading ${file.name}...`);

    try {
      const image = await uploadLogoFile(file, "team");
      setTeamEntries((current) =>
        current.map((entry, entryIndex) =>
          entryIndex === index
            ? {
                ...entry,
                logoName: image.name || file.name,
                logoDataUrl: image.url || "",
                logoPublicId: image.publicId || "",
              }
            : entry
        )
      );
      setStatusMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setUploadingTeamIndex(null);
      event.target.value = "";
    }
  }

  function persistSavedTournaments(nextSavedTournaments) {
    setSavedTournaments(nextSavedTournaments.map(hydrateTournamentRecord));
    window.dispatchEvent(new Event(SAVED_TOURNAMENTS_EVENT));
  }

  async function createTournamentRecord(record) {
    const response = await fetch("/api/tournaments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to save the tournament.");
    }

    return hydrateTournamentRecord(result.tournament);
  }

  async function updateTournamentRecord(tournamentId, record) {
    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to update the tournament.");
    }

    return hydrateTournamentRecord(result.tournament);
  }

  async function deleteTournamentRecord(tournamentId) {
    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to delete the tournament.");
    }
  }

  function requestProtectedAction(type, tournament) {
    setPendingProtectedAction({
      type,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    });
    setAdminPassword("");
    setPasswordError("");
  }

  function closeProtectedActionPrompt() {
    setPendingProtectedAction(null);
    setAdminPassword("");
    setPasswordError("");
    setIsVerifyingPassword(false);
  }

  async function verifyAdminPassword(action) {
    const response = await fetch("/api/admin/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: adminPassword,
        action,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Admin password verification failed.");
    }
  }

  async function confirmProtectedAction() {
    if (!pendingProtectedAction) {
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError("");

    try {
      await verifyAdminPassword(pendingProtectedAction.type);

      if (pendingProtectedAction.type === "pause") {
        await pauseTournament(pendingProtectedAction.tournamentId);
      }

      if (pendingProtectedAction.type === "end") {
        await endTournament(pendingProtectedAction.tournamentId);
      }

      if (pendingProtectedAction.type === "edit") {
        editTournament(
          savedTournaments.find(
            (tournament) => tournament.id === pendingProtectedAction.tournamentId
          )
        );
      }

      if (pendingProtectedAction.type === "delete") {
        await deleteTournament(pendingProtectedAction.tournamentId);
      }

      closeProtectedActionPrompt();
    } catch (error) {
      setPasswordError(error.message);
      setIsVerifyingPassword(false);
    }
  }

  function canMoveNext() {
    if (step === 1) {
      return form.name.trim() !== "";
    }

    if (step === 2) {
      return form.teamCount !== "";
    }

    if (step === 3) {
      return form.tournamentType === "group" || form.tournamentType === "league";
    }

    if (step === 4) {
      return form.tournamentType === "league" || form.groupCount !== "";
    }

    if (step === 5) {
      return (
        form.tournamentType === "league" ||
        (form.minTeamsPerGroup !== "" && form.maxTeamsPerGroup !== "")
      );
    }

    return false;
  }

  function nextStep() {
    if (!canMoveNext()) {
      return;
    }

    if (step === 3 && form.tournamentType === "league") {
      initializeTeamEntries();
      setStep(6);
      return;
    }

    if (step < 5) {
      setStep((current) => current + 1);
    }
  }

  function previousStep() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  function initializeTeamEntries() {
    const totalTeams = Number.parseInt(form.teamCount, 10) || 0;
    const teamCountChanged = teamEntries.length !== totalTeams;

    setTeamEntries((currentEntries) =>
      Array.from({ length: totalTeams }, (_, index) => ({
        id: index + 1,
        name: currentEntries[index]?.name || "",
        manualGroup: currentEntries[index]?.manualGroup || "",
        logoName: currentEntries[index]?.logoName || "",
        logoDataUrl: currentEntries[index]?.logoDataUrl || "",
        logoPublicId: currentEntries[index]?.logoPublicId || "",
      }))
    );

    if (teamCountChanged) {
      setGroups([]);
      setFixtures(null);
      setStatusMessage("Team count changed. Please regenerate groups and fixtures before saving.");
    } else {
      setStatusMessage("");
    }
  }

  function closeSetupEditor(message) {
    setIsStarted(false);
    setStep(1);
    setForm(initialForm);
    setTeamEntries([]);
    setOptions(initialOptions);
    setGroups([]);
    setFixtures(null);
    setEditingTournamentId(null);
    setStatusMessage(message);
  }

  function restartFlow() {
    closeSetupEditor("");
  }

  function completeSetup() {
    if (!canMoveNext()) {
      return;
    }

    initializeTeamEntries();
    setStep(6);
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setForm((current) => ({ ...current, logoName: "", logoDataUrl: "", logoPublicId: "" }));
      return;
    }

    setIsUploadingTournamentLogo(true);
    setStatusMessage(`Uploading ${file.name}...`);

    try {
      const image = await uploadLogoFile(file, "tournament");
      setForm((current) => ({
        ...current,
        logoName: image.name || file.name,
        logoDataUrl: image.url || "",
        logoPublicId: image.publicId || "",
      }));
      setStatusMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsUploadingTournamentLogo(false);
      event.target.value = "";
    }
  }

  function generateGroups() {
    if (groupCountValue < 2) {
      setStatusMessage("Enter at least 2 groups to generate the tournament.");
      return;
    }

    if (namedTeams.length === 0) {
      setStatusMessage("Enter at least one team name before generating groups.");
      return;
    }

    if (namedTeams.length < groupCountValue) {
      setStatusMessage("Total teams must be at least the number of groups.");
      return;
    }

    if (new Set(namedTeams).size !== namedTeams.length) {
      setStatusMessage("Team names must be unique.");
      return;
    }

    const minimumTeams = Number.parseInt(form.minTeamsPerGroup, 10) || 0;
    const maximumTeams = Number.parseInt(form.maxTeamsPerGroup, 10) || 0;
    const minActual = Math.floor(namedTeams.length / groupCountValue);
    const maxActual = Math.ceil(namedTeams.length / groupCountValue);

    if (minimumTeams && minActual < minimumTeams) {
      setStatusMessage("The current team count cannot satisfy the minimum teams per group.");
      return;
    }

    if (maximumTeams && maxActual > maximumTeams) {
      setStatusMessage("The current team count exceeds the maximum teams per group setting.");
      return;
    }

    const manualGroups = teamEntries.map((entry) => entry.manualGroup);

    if (options.assignMode === "manual") {
      const assignedCount = manualGroups.filter((value) => value !== "").length;

      if (assignedCount !== namedTeams.length) {
        setStatusMessage("Assign every named team to a group before generating groups.");
        return;
      }
    }

    const pool = options.assignMode === "auto" ? shuffleArray(namedTeams) : namedTeams;

    const nextGroups = buildGroups({
      teams: pool,
      groupCount: groupCountValue,
      unevenMode: options.unevenMode,
      assignMode: options.assignMode,
      manualGroups,
    });

    setGroups(nextGroups);
    setFixtures(null);
    setStatusMessage("Groups generated. You can now generate fixtures or export the result.");
  }

  function generateFixtures() {
    if (!groups.length) {
      setStatusMessage("Generate groups first.");
      return;
    }

    if (options.fixtureScope === "same") {
      const roundRobinMode = options.roundRobin;
      const extraLegs = roundRobinMode === "double" ? 2 : 1;
      const fixtureGroups = [];

      for (let index = 0; index < groups.length; index += 1) {
        const groupTeams = groups[index];
        const { rounds } = generateRoundRobin(groupTeams);
        const baseRounds = shuffleArray(rounds);
        let roundsToShow = baseRounds;

        if (extraLegs === 2) {
          roundsToShow = baseRounds.concat(baseRounds);
        }

        if (options.homeAway && roundRobinMode === "single" && roundsToShow.length) {
          const swappedRounds = roundsToShow.map((matches) =>
            matches.map(([home, away]) => [away, home])
          );
          roundsToShow = roundsToShow.concat(swappedRounds);
        }

        const arrangedRounds = options.backToBack
          ? roundsToShow
          : arrangeRoundsNoBackToBack(roundsToShow);

        if (!arrangedRounds) {
          setStatusMessage(
            `Unable to avoid back-to-back teams for ${getGroupLabel(index)} with the current options.`
          );
          return;
        }

        fixtureGroups.push({
          group: String.fromCharCode(65 + index),
          rounds: arrangedRounds.map((matches) =>
            matches.map(([home, away]) => ({ home, away }))
          ),
        });
      }

      setFixtures({
        scope: "same",
        roundRobin: options.roundRobin,
        homeAway: options.homeAway,
        backToBackAllowed: options.backToBack,
        groups: fixtureGroups,
      });
      setStatusMessage("Fixtures generated for the current groups.");
      return;
    }

    const crossFixtures = buildCrossGroupFixtures(groups, options.homeAway);

    const pairs = crossFixtures.map((pair) => {
      const orderedMatches = options.backToBack ? pair.matches : orderMatchesStrict(pair.matches);

      return {
        label: pair.label,
        matches: orderedMatches ? orderedMatches.map(([home, away]) => ({ home, away })) : [],
      };
    });

    setFixtures({
      scope: "cross",
      roundRobin: options.roundRobin,
      homeAway: options.homeAway,
      backToBackAllowed: options.backToBack,
      pairs,
    });
    setStatusMessage("Cross-group fixtures generated.");
  }

  function generateManualFixtures() {
    if (form.tournamentType === "group") {
      if (!groups.length) {
        setStatusMessage("Generate groups first.");
        return;
      }

      if (options.fixtureScope === "same") {
        const fixtureGroups = groups.map((groupTeams, index) => ({
          group: String.fromCharCode(65 + index),
          groupIndex: index,
          rounds: buildManualRoundSlots(groupTeams, options.roundRobin, options.homeAway),
        }));

        setFixtures({
          scope: "same",
          roundRobin: options.roundRobin,
          homeAway: options.homeAway,
          backToBackAllowed: options.backToBack,
          generationMode: "manual",
          groups: fixtureGroups,
        });
        setStatusMessage("Manual fixture canvas created. Select teams for each match.");
        return;
      }

      const crossFixtures = buildCrossGroupFixtures(groups, options.homeAway);
      const pairs = [];

      for (let leftIndex = 0; leftIndex < groups.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex += 1) {
          if (!groups[leftIndex].length || !groups[rightIndex].length) {
            continue;
          }

          const pair = crossFixtures[pairs.length];
          pairs.push({
            label: pair.label,
            leftGroupIndex: leftIndex,
            rightGroupIndex: rightIndex,
            matches: pair.matches.map(() => ({ home: "", away: "" })),
          });
        }
      }

      setFixtures({
        scope: "cross",
        roundRobin: options.roundRobin,
        homeAway: options.homeAway,
        backToBackAllowed: options.backToBack,
        generationMode: "manual",
        pairs,
      });
      setStatusMessage("Manual fixture canvas created. Select teams for each cross-group match.");
      return;
    }

    if (namedTeams.length < 2) {
      setStatusMessage("Enter at least two team names to create manual league fixtures.");
      return;
    }

    if (new Set(namedTeams).size !== namedTeams.length) {
      setStatusMessage("Team names must be unique.");
      return;
    }

    setGroups([]);
    setFixtures({
      scope: "league",
      homeAway: options.homeAway,
      backToBackAllowed: options.backToBack,
      generationMode: "manual",
      rounds: buildManualRoundSlots(namedTeams, options.roundRobin, options.homeAway),
    });
    setStatusMessage("Manual league fixture canvas created. Select teams for each match.");
  }

  function generateLeagueFixtures() {
    if (namedTeams.length < 2) {
      setStatusMessage("Enter at least two team names to generate league fixtures.");
      return;
    }

    if (new Set(namedTeams).size !== namedTeams.length) {
      setStatusMessage("Team names must be unique.");
      return;
    }

    const { rounds } = generateRoundRobin(namedTeams);
    let roundsToShow = shuffleArray(rounds);

    if (options.homeAway && roundsToShow.length) {
      const swappedRounds = roundsToShow.map((matches) =>
        matches.map(([home, away]) => [away, home])
      );
      roundsToShow = roundsToShow.concat(swappedRounds);
    }

    const arrangedRounds = options.backToBack
      ? roundsToShow
      : arrangeRoundsNoBackToBack(roundsToShow);

    if (!arrangedRounds) {
      setStatusMessage("Unable to avoid back-to-back teams for this league setup.");
      return;
    }

    setGroups([]);
    setFixtures({
      scope: "league",
      homeAway: options.homeAway,
      backToBackAllowed: options.backToBack,
      rounds: arrangedRounds.map((matches) =>
        matches.map(([home, away]) => ({ home, away }))
      ),
    });
    setStatusMessage("League fixtures generated.");
  }

  function updateGroupedFixtureMatch(groupIndex, roundIndex, matchIndex, field, value) {
    setFixtures((currentFixtures) => {
      if (!currentFixtures || currentFixtures.scope !== "same") {
        return currentFixtures;
      }

      return {
        ...currentFixtures,
        groups: currentFixtures.groups.map((group, currentGroupIndex) =>
          currentGroupIndex === groupIndex
            ? {
                ...group,
                rounds: group.rounds.map((matches, currentRoundIndex) =>
                  currentRoundIndex === roundIndex
                    ? matches.map((match, currentMatchIndex) =>
                        currentMatchIndex === matchIndex
                          ? { ...match, [field]: value }
                          : match
                      )
                    : matches
                ),
              }
            : group
        ),
      };
    });
  }

  function updateCrossFixtureMatch(pairIndex, matchIndex, field, value) {
    setFixtures((currentFixtures) => {
      if (!currentFixtures || currentFixtures.scope !== "cross") {
        return currentFixtures;
      }

      return {
        ...currentFixtures,
        pairs: currentFixtures.pairs.map((pair, currentPairIndex) =>
          currentPairIndex === pairIndex
            ? {
                ...pair,
                matches: pair.matches.map((match, currentMatchIndex) =>
                  currentMatchIndex === matchIndex ? { ...match, [field]: value } : match
                ),
              }
            : pair
        ),
      };
    });
  }

  function updateLeagueFixtureMatch(roundIndex, matchIndex, field, value) {
    setFixtures((currentFixtures) => {
      if (!currentFixtures || currentFixtures.scope !== "league") {
        return currentFixtures;
      }

      return {
        ...currentFixtures,
        rounds: currentFixtures.rounds.map((matches, currentRoundIndex) =>
          currentRoundIndex === roundIndex
            ? matches.map((match, currentMatchIndex) =>
                currentMatchIndex === matchIndex ? { ...match, [field]: value } : match
              )
            : matches
        ),
      };
    });
  }

  function hasIncompleteFixtures(currentFixtures) {
    if (!currentFixtures) {
      return true;
    }

    if (currentFixtures.scope === "same") {
      return currentFixtures.groups.some((group) =>
        group.rounds.some((matches) =>
          matches.some((match) => !match.home || !match.away || match.home === match.away)
        )
      );
    }

    if (currentFixtures.scope === "cross") {
      return currentFixtures.pairs.some((pair) =>
        pair.matches.some((match) => !match.home || !match.away || match.home === match.away)
      );
    }

    if (currentFixtures.scope === "league") {
      return currentFixtures.rounds.some((matches) =>
        matches.some((match) => !match.home || !match.away || match.home === match.away)
      );
    }

    return true;
  }

  function exportTournament() {
    const payload = buildTournamentPayload();

    if (!payload) {
      return;
    }

    const json = JSON.stringify(payload, null, 2);
    window.localStorage.setItem("dynamitesData", json);

    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tournament-data.json";
    link.click();
    window.URL.revokeObjectURL(url);

    setStatusMessage("Tournament data exported and saved in local storage.");
  }

  function buildTournamentPayload() {
    if (form.tournamentType === "group" && !groups.length) {
      setStatusMessage("Generate groups before saving or exporting.");
      return null;
    }

    if (!fixtures) {
      setStatusMessage("Generate fixtures before saving or exporting.");
      return null;
    }

    if (hasIncompleteFixtures(fixtures)) {
      setStatusMessage("Complete every fixture row with two different teams before saving or exporting.");
      return null;
    }

    const existingTournament = editingTournamentId
      ? savedTournaments.find((tournament) => tournament.id === editingTournamentId)
      : null;

    return {
      meta: {
        exportedAt: new Date().toISOString(),
      },
      settings: {
        name: form.name,
        startDate: form.startDate,
        endDate: existingTournament?.endDate || "",
        logoName: form.logoName,
        teamCount: Number.parseInt(form.teamCount, 10) || 0,
        tournamentType: form.tournamentType,
        groupCount: groupCountValue,
        assignMode: options.assignMode,
        unevenMode: options.unevenMode,
        roundRobin: options.roundRobin,
        fixtureScope: options.fixtureScope,
        minTeamsPerGroup: Number.parseInt(form.minTeamsPerGroup, 10) || 0,
        maxTeamsPerGroup: Number.parseInt(form.maxTeamsPerGroup, 10) || 0,
      },
      teams: namedTeams,
      teamData: teamEntries
        .map((entry, index) => ({
          id: index + 1,
          name: entry.name.trim(),
          logo: entry.logoDataUrl
            ? {
                name: entry.logoName || "",
                url: entry.logoDataUrl,
                publicId: entry.logoPublicId || "",
              }
            : null,
          logoName: entry.logoName || "",
        }))
        .filter((entry) => entry.name),
      tournamentLogo: form.logoDataUrl
        ? {
            name: form.logoName,
            url: form.logoDataUrl,
            publicId: form.logoPublicId || "",
          }
        : null,
      groups: form.tournamentType === "group" ? groups : [],
      fixtures: form.tournamentType === "group" ? fixtures : null,
      leagueFixtures: form.tournamentType === "league" ? fixtures : null,
    };
  }

  async function saveTournament() {
    const payload = buildTournamentPayload();

    if (!payload) {
      return;
    }

    const existingTournament = editingTournamentId
      ? savedTournaments.find((tournament) => tournament.id === editingTournamentId)
      : null;

    const record = {
      id: editingTournamentId || `${Date.now()}`,
      name: form.name,
      startDate: form.startDate,
      endDate: existingTournament?.endDate || "",
      phase: getAdminTournamentPhase({
        startDate: form.startDate,
        endDate: existingTournament?.endDate || "",
        launched: existingTournament?.launched || false,
        paused: existingTournament?.paused || false,
      }),
      tournamentType: form.tournamentType,
      teamCount: payload.settings.teamCount,
      groupCount: payload.settings.groupCount,
      launched: existingTournament?.launched || false,
      paused: existingTournament?.paused || false,
      launchedAt: existingTournament?.launchedAt || null,
      savedAt: new Date().toISOString(),
      data: payload,
    };

    try {
      const savedRecord = editingTournamentId
        ? await updateTournamentRecord(record.id, record)
        : await createTournamentRecord(record);

      const remainingTournaments = savedTournaments.filter(
        (tournament) => tournament.id !== savedRecord.id
      );
      const nextSavedTournaments = [savedRecord, ...remainingTournaments];
      persistSavedTournaments(nextSavedTournaments);
      setActiveTab("manage");
      closeSetupEditor(
        editingTournamentId
          ? "Tournament updated and saved. The setup form has been closed."
          : "Tournament saved. The setup form has been closed."
      );
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function launchTournament(tournamentId) {
    const currentTournament = savedTournaments.find((tournament) => tournament.id === tournamentId);

    if (!currentTournament) {
      return;
    }

    const updatedTournament = {
      ...currentTournament,
      launched: true,
      paused: false,
      endDate: "",
      phase: "ongoing",
      launchedAt: currentTournament.launchedAt || new Date().toISOString(),
      data: currentTournament.data
        ? {
            ...currentTournament.data,
            settings: {
              ...currentTournament.data.settings,
              endDate: "",
            },
          }
        : currentTournament.data,
    };

    try {
      const savedRecord = await updateTournamentRecord(tournamentId, updatedTournament);
      const nextSavedTournaments = savedTournaments.map((tournament) =>
        tournament.id === tournamentId ? savedRecord : tournament
      );
      persistSavedTournaments(nextSavedTournaments);
      setStatusMessage("Tournament launched. It is now visible to normal users.");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function pauseTournament(tournamentId) {
    const currentTournament = savedTournaments.find((tournament) => tournament.id === tournamentId);

    if (!currentTournament) {
      return;
    }

    const updatedTournament = {
      ...currentTournament,
      launched: false,
      paused: true,
      phase: getAdminTournamentPhase({
        startDate: currentTournament.startDate,
        endDate: currentTournament.endDate,
        launched: false,
        paused: true,
      }),
    };

    try {
      const savedRecord = await updateTournamentRecord(tournamentId, updatedTournament);
      const nextSavedTournaments = savedTournaments.map((tournament) =>
        tournament.id === tournamentId ? savedRecord : tournament
      );
      persistSavedTournaments(nextSavedTournaments);
      setStatusMessage("Tournament paused. It is hidden from normal users until launched again.");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function endTournament(tournamentId) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const endDate = yesterday.toISOString().slice(0, 10);

    const currentTournament = savedTournaments.find((tournament) => tournament.id === tournamentId);

    if (!currentTournament) {
      return;
    }

    const nextData = currentTournament.data
      ? {
          ...currentTournament.data,
          settings: {
            ...currentTournament.data.settings,
            endDate,
          },
        }
      : currentTournament.data;

    const updatedTournament = {
      ...currentTournament,
      endDate,
      phase: getAdminTournamentPhase({
        startDate: currentTournament.startDate,
        endDate,
        launched: currentTournament.launched,
        paused: currentTournament.paused,
      }),
      data: nextData,
    };

    try {
      const savedRecord = await updateTournamentRecord(tournamentId, updatedTournament);
      const nextSavedTournaments = savedTournaments.map((tournament) =>
        tournament.id === tournamentId ? savedRecord : tournament
      );
      persistSavedTournaments(nextSavedTournaments);
      setStatusMessage("Tournament ended. It is now moved to Past Tournaments for normal users.");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function editTournament(tournament) {
    const payload = tournament.data || {};
    const settings = payload.settings || {};
    const teams = Array.isArray(payload.teamData) && payload.teamData.length
      ? payload.teamData.map((team) => ({
          name: team.name,
          logo: team.logo || "",
          logoName: team.logoName || "",
        }))
      : Array.isArray(payload.teams)
        ? payload.teams.map((team) => ({
            name: team,
            logo: "",
            logoName: "",
          }))
        : [];
    const savedGroups = Array.isArray(payload.groups) ? payload.groups : [];

    const nextTeamEntries = teams.map((team, index) => {
      const manualGroupIndex =
        settings.tournamentType === "group" && settings.assignMode === "manual"
          ? savedGroups.findIndex(
              (group) => Array.isArray(group) && group.includes(team.name)
            )
          : -1;

      return {
        id: index + 1,
        name: team.name,
        manualGroup: manualGroupIndex >= 0 ? String(manualGroupIndex) : "",
        logoName: team.logoName,
        logoDataUrl: getStoredImageUrl(team.logo),
        logoPublicId: getStoredImagePublicId(team.logo),
      };
    });

    setForm({
      name: settings.name || tournament.name || "",
      startDate: settings.startDate || tournament.startDate || "",
      logoName: settings.logoName || payload.tournamentLogo?.name || "",
      logoDataUrl: getStoredImageUrl(payload.tournamentLogo),
      logoPublicId: getStoredImagePublicId(payload.tournamentLogo),
      teamCount: String(settings.teamCount || teams.length || ""),
      tournamentType: settings.tournamentType || tournament.tournamentType || "",
      groupCount: String(settings.groupCount || tournament.groupCount || ""),
      minTeamsPerGroup: String(settings.minTeamsPerGroup || ""),
      maxTeamsPerGroup: String(settings.maxTeamsPerGroup || ""),
    });
    setOptions({
      assignMode: settings.assignMode || "auto",
      unevenMode: settings.unevenMode || "balanced",
      roundRobin: settings.roundRobin || "single",
      fixtureScope: settings.fixtureScope || "same",
      homeAway: Boolean(
        payload.fixtures?.homeAway ?? payload.leagueFixtures?.homeAway ?? false
      ),
      backToBack: Boolean(
        payload.fixtures?.backToBackAllowed ?? payload.leagueFixtures?.backToBackAllowed ?? false
      ),
    });
    setTeamEntries(nextTeamEntries);
    setGroups(savedGroups);
    setFixtures(payload.fixtures || payload.leagueFixtures || null);
    setActiveTab("setup");
    setIsStarted(true);
    setStep(1);
    setEditingTournamentId(tournament.id);
    setStatusMessage(
      `Editing "${tournament.name}". All saved values are loaded into the wizard for changes.`
    );
  }

  async function deleteTournament(tournamentId) {
    try {
      await deleteTournamentRecord(tournamentId);
      const nextSavedTournaments = savedTournaments.filter(
        (tournament) => tournament.id !== tournamentId
      );
      persistSavedTournaments(nextSavedTournaments);

      if (editingTournamentId === tournamentId) {
        restartFlow();
        setStatusMessage("Tournament deleted and removed from the editor.");
        return;
      }

      setStatusMessage("Tournament deleted from the Saved Tournament section.");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function renderSavedTournamentCard(tournament) {
    const isRunning = tournament.launched && tournament.phase !== "past";
    const isEnded = tournament.phase === "past";
    const editDisabled = tournament.launched || isEnded;
    const canDelete = adminSession?.role === "master_admin";
    const deleteDisabled = isRunning || !canDelete;
    const tournamentLogoUrl = getStoredImageUrl(tournament.data?.tournamentLogo);
    return (
      <article className={styles.savedCard} key={tournament.id}>
        <div className={styles.savedCardHeader}>
          <div className={styles.savedCardTitleBlock}>
            {tournamentLogoUrl ? (
              <img
                alt={`${tournament.name} logo`}
                className={styles.savedTournamentLogo}
                src={tournamentLogoUrl}
              />
            ) : null}
            <h3 className={styles.resultTitle}>{tournament.name}</h3>
          </div>

          <Link
            className={styles.manageTournamentButton}
            href={`/admin/dashboard/${tournament.id}`}
          >
            Manage Tournament
          </Link>
        </div>

        <p className={styles.resultMeta}>
          Type: {tournament.tournamentType === "league" ? "League" : "Group"}
        </p>
        <p className={styles.resultMeta}>Start: {tournament.startDate || "N/A"}</p>
        <p className={styles.resultMeta}>End: {tournament.endDate || "N/A"}</p>
        <p className={styles.resultMeta}>Teams: {tournament.teamCount}</p>
        {tournament.tournamentType === "group" ? (
          <p className={styles.resultMeta}>Groups: {tournament.groupCount}</p>
        ) : null}
        {adminSession?.role === "master_admin" && tournament.ownerUsername ? (
          <p className={styles.resultMeta}>Owner: {tournament.ownerUsername}</p>
        ) : null}
        <p className={styles.resultMeta}>Saved: {new Date(tournament.savedAt).toLocaleString()}</p>
        <div className={styles.savedActions}>
          <div className={styles.savedPrimaryActions}>
            <button
              className={isRunning ? styles.endButton : styles.launchButton}
              onClick={() =>
                isRunning
                  ? requestProtectedAction("end", tournament)
                  : launchTournament(tournament.id)
              }
              type="button"
            >
              {isRunning ? "End Tournament" : isEnded ? "Start Again" : "Launch Tournament"}
            </button>

            {isRunning ? (
              <button
                className={styles.pauseButton}
                onClick={() => requestProtectedAction("pause", tournament)}
                type="button"
              >
                Pause Tournament
              </button>
            ) : null}
          </div>

          <div className={styles.savedSecondaryActions}>
            <button
              className={styles.savedActionButton}
              disabled={editDisabled}
              onClick={() => requestProtectedAction("edit", tournament)}
              type="button"
            >
              Edit
            </button>
            {canDelete ? (
              <button
                className={styles.deleteButton}
                disabled={deleteDisabled}
                onClick={() => requestProtectedAction("delete", tournament)}
                type="button"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.tabRow}>
        <button
          className={`${styles.tabButton} ${activeTab === "setup" ? styles.activeTabButton : ""}`}
          onClick={() => setActiveTab("setup")}
          type="button"
        >
          Tournament Setup
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "manage" ? styles.activeTabButton : ""}`}
          onClick={() => setActiveTab("manage")}
          type="button"
        >
          Tournament Manage
        </button>
      </div>

      {activeTab === "setup" ? (
        !isStarted ? (
          <div className={styles.emptyCard}>
            <button
              className={styles.createButton}
              onClick={() => setIsStarted(true)}
              type="button"
            >
              Create a tournament
            </button>
          </div>
        ) : (
          <div className={styles.formCard}>
          <div className={styles.progressRow}>
            <p className={styles.stepLabel}>Step {Math.min(step, totalSteps)} of {totalSteps}</p>
            <button className={styles.linkButton} onClick={restartFlow} type="button">
              Reset
            </button>
          </div>

          {editingTournamentId ? (
            <p className={styles.notice}>You are editing a saved tournament. Save will update it.</p>
          ) : null}

          {step === 1 ? (
            <div className={styles.stepBlock}>
              <h2 className={styles.question}>Name of the tournament</h2>
              <p className={styles.helper}>This field is mandatory.</p>
              <input
                className={styles.input}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Enter tournament name"
                type="text"
                value={form.name}
              />

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="tournament-start-date">
                  Start Date
                </label>
                <p className={styles.helper}>Set the tournament start date.</p>
                <input
                  className={styles.input}
                  id="tournament-start-date"
                  onChange={(event) => updateField("startDate", event.target.value)}
                  type="date"
                  value={form.startDate}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="tournament-logo">
                  Tournament Logo
                </label>
                <p className={styles.helper}>Optional. Upload a logo for this tournament.</p>
                <input
                  className={styles.input}
                  id="tournament-logo"
                  accept="image/*"
                  disabled={isUploadingLogo}
                  onChange={handleLogoChange}
                  type="file"
                />
                {form.logoName ? (
                  <div className={styles.logoPreviewRow}>
                    {form.logoDataUrl ? (
                      <img
                        alt="Tournament logo preview"
                        className={styles.logoPreview}
                        src={form.logoDataUrl}
                      />
                    ) : null}
                    <p className={styles.resultMeta}>
                      {isUploadingTournamentLogo
                        ? `Uploading ${form.logoName || "logo"}...`
                        : `Uploaded file: ${form.logoName}`}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.stepBlock}>
              <h2 className={styles.question}>How many teams will be in the tournament?</h2>
              <p className={styles.helper}>This field is mandatory.</p>
              <input
                className={styles.input}
                min="2"
                onChange={(event) => updateField("teamCount", event.target.value)}
                placeholder="Enter number of teams"
                type="number"
                value={form.teamCount}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.stepBlock}>
              <h2 className={styles.question}>Will it be group based or league based?</h2>
              <p className={styles.helper}>
                Select one option to continue. You can create either a group tournament or a
                no-group league fixture setup.
              </p>
              <div className={styles.radioGrid}>
                <label className={styles.radioCard}>
                  <input
                    checked={form.tournamentType === "group"}
                    name="tournamentType"
                    onChange={() => updateField("tournamentType", "group")}
                    type="radio"
                  />
                  <span>Group</span>
                </label>

                <label className={styles.radioCard}>
                  <input
                    checked={form.tournamentType === "league"}
                    name="tournamentType"
                    onChange={() => updateField("tournamentType", "league")}
                    type="radio"
                  />
                  <span>League</span>
                </label>
              </div>

              {form.tournamentType === "league" ? (
                <p className={styles.notice}>
                  League setup skips group questions and goes straight to league fixture
                  generation.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 4 && form.tournamentType === "group" ? (
            <div className={styles.stepBlock}>
              <h2 className={styles.question}>How many groups will be in the tournament?</h2>
              <p className={styles.helper}>This field is mandatory for the group-based setup.</p>
              <input
                className={styles.input}
                min="2"
                onChange={(event) => updateField("groupCount", event.target.value)}
                placeholder="Enter number of groups"
                type="number"
                value={form.groupCount}
              />
            </div>
          ) : null}

          {step === 5 && form.tournamentType === "group" ? (
            <div className={styles.stepBlock}>
              <h2 className={styles.question}>
                How many teams will be in one group? Minimum and maximum.
              </h2>
              <p className={styles.helper}>Both fields are mandatory.</p>
              <div className={styles.doubleGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="min-teams">
                    Minimum Teams
                  </label>
                  <input
                    className={styles.input}
                    id="min-teams"
                    min="1"
                    onChange={(event) => updateField("minTeamsPerGroup", event.target.value)}
                    placeholder="Minimum teams"
                    type="number"
                    value={form.minTeamsPerGroup}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="max-teams">
                    Maximum Teams
                  </label>
                  <input
                    className={styles.input}
                    id="max-teams"
                    min="1"
                    onChange={(event) => updateField("maxTeamsPerGroup", event.target.value)}
                    placeholder="Maximum teams"
                    type="number"
                    value={form.maxTeamsPerGroup}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className={styles.setupBlock}>
              <div className={styles.stepBlock}>
                <h2 className={styles.question}>
                  {form.tournamentType === "league" ? "League team setup" : "Team setup"}
                </h2>
                <p className={styles.helper}>
                  {form.tournamentType === "league"
                    ? "Add the teams, then generate league fixtures using the backend no-group logic."
                    : "Add the teams, choose how groups should be assigned, then generate groups and fixtures using the backend logic now ported into this flow."}
                </p>
              </div>

              <div className={styles.optionGrid}>
                {form.tournamentType === "group" ? (
                  <>
                    <div className={styles.optionCard}>
                      <p className={styles.optionTitle}>Assignment mode</p>
                      <label className={styles.optionLabel}>
                        <input
                          checked={options.assignMode === "auto"}
                          name="assignMode"
                          onChange={() => updateOption("assignMode", "auto")}
                          type="radio"
                        />
                        <span>Auto random</span>
                      </label>
                      <label className={styles.optionLabel}>
                        <input
                          checked={options.assignMode === "manual"}
                          name="assignMode"
                          onChange={() => updateOption("assignMode", "manual")}
                          type="radio"
                        />
                        <span>Manual</span>
                      </label>
                    </div>

                    <div className={styles.optionCard}>
                      <p className={styles.optionTitle}>Uneven teams</p>
                      <label className={styles.optionLabel}>
                        <input
                          checked={options.unevenMode === "balanced"}
                          name="unevenMode"
                          onChange={() => updateOption("unevenMode", "balanced")}
                          type="radio"
                        />
                        <span>Balanced</span>
                      </label>
                      <label className={styles.optionLabel}>
                        <input
                          checked={options.unevenMode === "fill-first"}
                          name="unevenMode"
                          onChange={() => updateOption("unevenMode", "fill-first")}
                          type="radio"
                        />
                        <span>Fill earlier groups first</span>
                      </label>
                    </div>
                  </>
                ) : null}

                <div className={styles.optionCard}>
                  <p className={styles.optionTitle}>Round robin</p>
                  <label className={styles.optionLabel}>
                    <input
                      checked={options.roundRobin === "single"}
                      name="roundRobin"
                      onChange={() => updateOption("roundRobin", "single")}
                      type="radio"
                    />
                    <span>Single</span>
                  </label>
                  <label className={styles.optionLabel}>
                    <input
                      checked={options.roundRobin === "double"}
                      name="roundRobin"
                      onChange={() => updateOption("roundRobin", "double")}
                      type="radio"
                    />
                    <span>Double</span>
                  </label>
                </div>

                {form.tournamentType === "group" ? (
                  <div className={styles.optionCard}>
                    <p className={styles.optionTitle}>Fixture scope</p>
                    <label className={styles.optionLabel}>
                      <input
                        checked={options.fixtureScope === "same"}
                        name="fixtureScope"
                        onChange={() => updateOption("fixtureScope", "same")}
                        type="radio"
                      />
                      <span>Same group</span>
                    </label>
                    <label className={styles.optionLabel}>
                      <input
                        checked={options.fixtureScope === "cross"}
                        name="fixtureScope"
                        onChange={() => updateOption("fixtureScope", "cross")}
                        type="radio"
                      />
                      <span>Cross group</span>
                    </label>
                  </div>
                ) : null}
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={options.homeAway}
                    onChange={(event) => updateOption("homeAway", event.target.checked)}
                    type="checkbox"
                  />
                  <span>Home/Away</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    checked={options.backToBack}
                    onChange={(event) => updateOption("backToBack", event.target.checked)}
                    type="checkbox"
                  />
                  <span>Allow back-to-back teams</span>
                </label>
              </div>

              <div className={styles.teamGrid}>
                {teamEntries.map((entry, index) => (
                  <div className={styles.teamRow} key={entry.id}>
                    <input
                      className={styles.input}
                      onChange={(event) => updateTeamEntry(index, "name", event.target.value)}
                      placeholder={`Team ${entry.id}`}
                      type="text"
                      value={entry.name}
                    />

                    <div className={styles.teamLogoCell}>
                      <input
                        accept="image/*"
                        className={styles.input}
                        disabled={isUploadingLogo}
                        onChange={(event) => handleTeamLogoChange(index, event)}
                        type="file"
                      />

                      {entry.logoDataUrl ? (
                        <img
                          alt={`${entry.name || `Team ${entry.id}`} logo`}
                          className={styles.teamLogoPreview}
                          src={entry.logoDataUrl}
                        />
                      ) : null}
                      {uploadingTeamIndex === index ? (
                        <p className={styles.resultMeta}>Uploading {entry.logoName || "logo"}...</p>
                      ) : null}
                    </div>

                    <select
                      className={styles.select}
                      disabled={form.tournamentType !== "group" || options.assignMode !== "manual"}
                      onChange={(event) => updateTeamEntry(index, "manualGroup", event.target.value)}
                      value={entry.manualGroup}
                    >
                      <option value="">Select group</option>
                      {Array.from({ length: groupCountValue }, (_, groupIndex) => (
                        <option key={getGroupLabel(groupIndex)} value={groupIndex}>
                          {getGroupLabel(groupIndex)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className={styles.generatorActions}>
                {form.tournamentType === "group" ? (
                  <>
                    <button
                      className={styles.secondaryButton}
                      onClick={generateGroups}
                      type="button"
                    >
                      Generate Groups
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={generateFixtures}
                      type="button"
                    >
                      Generate Fixtures (Auto)
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={generateManualFixtures}
                      type="button"
                    >
                      Generate Fixtures (Manual)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.secondaryButton}
                      onClick={generateLeagueFixtures}
                      type="button"
                    >
                      Generate Fixtures (Auto)
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={generateManualFixtures}
                      type="button"
                    >
                      Generate Fixtures (Manual)
                    </button>
                  </>
                )}
                <button
                  className={styles.secondaryButton}
                  disabled={isUploadingLogo}
                  onClick={saveTournament}
                  type="button"
                >
                  Save Tournament
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isUploadingLogo}
                  onClick={exportTournament}
                  type="button"
                >
                  Export JSON
                </button>
              </div>

              {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}

              {form.tournamentType === "group" && groups.length ? (
                <div className={styles.resultsGrid}>
                  {groups.map((groupTeams, index) => (
                    <div className={styles.resultCard} key={getGroupLabel(index)}>
                      <h3 className={styles.resultTitle}>{getGroupLabel(index)}</h3>
                      <p className={styles.resultMeta}>Teams: {groupTeams.length}</p>
                      <ul className={styles.resultList}>
                        {groupTeams.length ? (
                          groupTeams.map((team) => <li key={team}>{team}</li>)
                        ) : (
                          <li>No teams assigned</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {fixtures?.scope === "same" ? (
                <div className={styles.fixturesGrid}>
                  {fixtures.groups.map((group) => (
                    <div className={styles.resultCard} key={group.group}>
                      <h3 className={styles.resultTitle}>Group {group.group} Fixtures</h3>
                      <div className={styles.roundList}>
                        {group.rounds.length ? (
                          group.rounds.map((matches, roundIndex) => (
                            <div className={styles.roundBlock} key={`${group.group}-${roundIndex + 1}`}>
                              <p className={styles.resultMeta}>Round {roundIndex + 1}</p>
                              {fixtures.generationMode === "manual" ? (
                                <div className={styles.manualFixtureStack}>
                                  {matches.map((match, matchIndex) => (
                                    <div
                                      className={styles.manualFixtureRow}
                                      key={`${group.group}-manual-${roundIndex + 1}-${matchIndex + 1}`}
                                    >
                                      <select
                                        className={styles.select}
                                        onChange={(event) =>
                                          updateGroupedFixtureMatch(
                                            group.groupIndex,
                                            roundIndex,
                                            matchIndex,
                                            "home",
                                            event.target.value
                                          )
                                        }
                                        value={match.home}
                                      >
                                        <option value="">Team 1</option>
                                        {groups[group.groupIndex]?.map((team) => (
                                          <option key={`${group.group}-home-${team}`} value={team}>
                                            {team}
                                          </option>
                                        ))}
                                      </select>
                                      <span className={styles.manualFixtureVs}>VS</span>
                                      <select
                                        className={styles.select}
                                        onChange={(event) =>
                                          updateGroupedFixtureMatch(
                                            group.groupIndex,
                                            roundIndex,
                                            matchIndex,
                                            "away",
                                            event.target.value
                                          )
                                        }
                                        value={match.away}
                                      >
                                        <option value="">Team 2</option>
                                        {groups[group.groupIndex]?.map((team) => (
                                          <option key={`${group.group}-away-${team}`} value={team}>
                                            {team}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <ul className={styles.resultList}>
                                  {matches.map((match) => (
                                    <li key={`${match.home}-${match.away}-${roundIndex}`}>
                                      {match.home} vs {match.away}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className={styles.resultMeta}>Not enough teams for fixtures.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {fixtures?.scope === "cross" ? (
                <div className={styles.fixturesGrid}>
                  {fixtures.pairs.map((pair, pairIndex) => (
                    <div className={styles.resultCard} key={pair.label}>
                      <h3 className={styles.resultTitle}>{pair.label}</h3>
                      {pair.matches.length ? (
                        fixtures.generationMode === "manual" ? (
                          <div className={styles.manualFixtureStack}>
                            {pair.matches.map((match, matchIndex) => (
                              <div className={styles.manualFixtureRow} key={`${pair.label}-${matchIndex}`}>
                                <select
                                  className={styles.select}
                                  onChange={(event) =>
                                    updateCrossFixtureMatch(
                                      pairIndex,
                                      matchIndex,
                                      "home",
                                      event.target.value
                                    )
                                  }
                                  value={match.home}
                                >
                                  <option value="">Team 1</option>
                                  {groups[pair.leftGroupIndex]?.map((team) => (
                                    <option key={`${pair.label}-home-${team}-${matchIndex}`} value={team}>
                                      {team}
                                    </option>
                                  ))}
                                </select>
                                <span className={styles.manualFixtureVs}>VS</span>
                                <select
                                  className={styles.select}
                                  onChange={(event) =>
                                    updateCrossFixtureMatch(
                                      pairIndex,
                                      matchIndex,
                                      "away",
                                      event.target.value
                                    )
                                  }
                                  value={match.away}
                                >
                                  <option value="">Team 2</option>
                                  {groups[pair.rightGroupIndex]?.map((team) => (
                                    <option key={`${pair.label}-away-${team}-${matchIndex}`} value={team}>
                                      {team}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ul className={styles.resultList}>
                            {pair.matches.map((match, index) => (
                              <li key={`${pair.label}-${match.home}-${match.away}-${index}`}>
                                {match.home} vs {match.away}
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <ul className={styles.resultList}>
                          <li>Unable to avoid back-to-back teams for this pairing.</li>
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {fixtures?.scope === "league" ? (
                <div className={styles.fixturesGrid}>
                  <div className={styles.resultCard}>
                    <h3 className={styles.resultTitle}>League Fixtures</h3>
                    <div className={styles.roundList}>
                      {fixtures.rounds.map((matches, roundIndex) => (
                        <div className={styles.roundBlock} key={`league-${roundIndex + 1}`}>
                          <p className={styles.resultMeta}>Round {roundIndex + 1}</p>
                          {fixtures.generationMode === "manual" ? (
                            <div className={styles.manualFixtureStack}>
                              {matches.map((match, matchIndex) => (
                                <div className={styles.manualFixtureRow} key={`league-${roundIndex}-${matchIndex}`}>
                                  <select
                                    className={styles.select}
                                    onChange={(event) =>
                                      updateLeagueFixtureMatch(
                                        roundIndex,
                                        matchIndex,
                                        "home",
                                        event.target.value
                                      )
                                    }
                                    value={match.home}
                                  >
                                    <option value="">Team 1</option>
                                    {namedTeams.map((team) => (
                                      <option key={`league-home-${team}-${matchIndex}`} value={team}>
                                        {team}
                                      </option>
                                    ))}
                                  </select>
                                  <span className={styles.manualFixtureVs}>VS</span>
                                  <select
                                    className={styles.select}
                                    onChange={(event) =>
                                      updateLeagueFixtureMatch(
                                        roundIndex,
                                        matchIndex,
                                        "away",
                                        event.target.value
                                      )
                                    }
                                    value={match.away}
                                  >
                                    <option value="">Team 2</option>
                                    {namedTeams.map((team) => (
                                      <option key={`league-away-${team}-${matchIndex}`} value={team}>
                                        {team}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <ul className={styles.resultList}>
                              {matches.map((match, index) => (
                                <li key={`league-${match.home}-${match.away}-${index}`}>
                                  {match.home} vs {match.away}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step < 6 ? (
            <div className={styles.actionRow}>
              <button
                className={styles.secondaryButton}
                disabled={step === 1}
                onClick={previousStep}
                type="button"
              >
                Back
              </button>

              {step < 5 ? (
                <button
                  className={styles.primaryButton}
                  disabled={!canMoveNext()}
                  onClick={nextStep}
                  type="button"
                >
                  {step === 3 && form.tournamentType === "league" ? "Continue" : "Next"}
                </button>
              ) : (
                <button
                  className={styles.primaryButton}
                  disabled={!canMoveNext()}
                  onClick={completeSetup}
                  type="button"
                >
                  Done
                </button>
              )}
            </div>
          ) : null}
          </div>
        )
      ) : null}

      {activeTab === "manage" ? (
        <div className={styles.savedSection}>
          <div className={styles.savedHeader}>
            <h2 className={styles.savedTitle}>Tournament Manage</h2>
            <p className={styles.savedText}>
              Review saved tournaments and control launch, pause, end, restart, or deletion.
            </p>
          </div>

          {savedTournaments.length ? (
            <div className={styles.savedStack}>
              <div>
                <h3 className={styles.savedSubTitle}>Upcoming Tournament</h3>
                {savedUpcomingTournaments.length ? (
                  <div className={styles.savedGrid}>
                    {savedUpcomingTournaments.map(renderSavedTournamentCard)}
                  </div>
                ) : (
                  <div className={styles.savedEmpty}>No upcoming tournaments saved.</div>
                )}
              </div>

              <div>
                <h3 className={styles.savedSubTitle}>Ongoing Tournament</h3>
                {savedOngoingTournaments.length ? (
                  <div className={styles.savedGrid}>
                    {savedOngoingTournaments.map(renderSavedTournamentCard)}
                  </div>
                ) : (
                  <div className={styles.savedEmpty}>No ongoing tournaments saved.</div>
                )}
              </div>

              <div>
                <h3 className={styles.savedSubTitle}>Past Tournament</h3>
                {savedPastTournaments.length ? (
                  <div className={styles.savedGrid}>
                    {savedPastTournaments.map(renderSavedTournamentCard)}
                  </div>
                ) : (
                  <div className={styles.savedEmpty}>No past tournaments saved.</div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.savedEmpty}>
              No saved tournaments yet. Use <strong>Tournament Setup</strong> to create and save
              one first.
            </div>
          )}
        </div>
      ) : null}

      {pendingProtectedAction ? (
        <div className={styles.passwordOverlay}>
          <div className={styles.passwordCard}>
            <h3 className={styles.passwordTitle}>Admin Password Required</h3>
            <p className={styles.passwordText}>
              Enter the {pendingProtectedAction.type === "delete" ? "master admin" : "admin"} password to approve{" "}
              <strong>
                {pendingProtectedAction.type === "pause"
                  ? "Pause Tournament"
                  : pendingProtectedAction.type === "end"
                    ? "End Tournament"
                  : pendingProtectedAction.type === "edit"
                    ? "Edit"
                    : "Delete"}
              </strong>{" "}
              for {pendingProtectedAction.tournamentName}.
            </p>
            <input
              className={styles.input}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Enter admin password"
              type="password"
              value={adminPassword}
            />
            {passwordError ? <p className={styles.status}>{passwordError}</p> : null}
            <div className={styles.passwordActions}>
              <button
                className={styles.secondaryButton}
                onClick={closeProtectedActionPrompt}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                disabled={!adminPassword || isVerifyingPassword}
                onClick={confirmProtectedAction}
                type="button"
              >
                {isVerifyingPassword ? "Verifying..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
