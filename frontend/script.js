document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loaded");

  const poolList = document.getElementById("team-pool-list");
  const groupsContainer = document.getElementById("groups-container");
  const sortBtn = document.getElementById("sort-btn");
  const sortStatus = document.getElementById("sort-status");
  const sortSpinner = document.getElementById("sort-spinner");
  const sortModal = document.getElementById("sort-modal");
  const fixturesBtn = document.getElementById("fixtures-btn");
  const fixturesOutput = document.getElementById("fixtures-output");
  const fixturesModal = document.getElementById("fixtures-modal");
  const flipLine = document.getElementById("flip-line");

  if (!poolList || !groupsContainer || !sortBtn || !sortStatus) return;

  let teams = [];
  let teamData = [];
  let drawQueue = [];
  let groupCount = 0;
  let assignedCount = 0;
  let cachedData = null;

  const renderTeams = () => {
    poolList.innerHTML = "";
    teams.forEach((team, index) => {
      const data = teamData.find((t) => t.name === team);
      const chip = document.createElement("div");
      chip.className = "team-chip";
      chip.style.animationDelay = `${index * 80}ms`;
      chip.dataset.team = team;
      if (data && data.logo) {
        chip.innerHTML = `<img src="${data.logo}" alt="${team}" /><span class="team-name">${team}</span>`;
      } else {
        chip.innerHTML = `<span class="team-name">${team}</span>`;
      }
      chip.dataset.team = team;
      poolList.appendChild(chip);
    });
  };

  const renderGroups = () => {
    groupsContainer.innerHTML = "";
    for (let i = 0; i < groupCount; i += 1) {
      const card = document.createElement("div");
      card.className = "group-card";
      const name = String.fromCharCode(65 + i);
      card.innerHTML = `<h4>Group ${name}</h4><ul id="group-${name}"></ul>`;
      groupsContainer.appendChild(card);
    }
  };

  const enableSorting = () => {
    sortBtn.disabled = false;
    sortStatus.textContent = "Click Sort to place teams into groups.";
  };

  const sortNextTeam = () => {
    if (assignedCount >= drawQueue.length) {
      sortBtn.disabled = true;
      sortStatus.textContent = "All teams assigned.";
      return;
    }
    sortBtn.disabled = true;
    sortStatus.textContent = "Sorting...";
    if (sortModal) sortModal.hidden = false;
    document.body.classList.add("is-blurred");

    const team = drawQueue[assignedCount];
    const targetGroupIndex = assignedCount % groupCount;
    const groupName = String.fromCharCode(65 + targetGroupIndex);
    const groupList = document.getElementById(`group-${groupName}`);

    const escape =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape
        : (value) => value.replace(/"/g, '\\"');
    const chip = poolList.querySelector(
      `.team-chip[data-team="${escape(team)}"]`
    );
    if (chip) {
      chip.classList.add("team-chip--moving");
    }

    setTimeout(() => {
      if (chip) {
        chip.remove();
      }
      const item = document.createElement("li");
      item.className = "group-item";
      const data = teamData.find((t) => t.name === team);
      if (data && data.logo) {
        item.innerHTML = `<img src="${data.logo}" alt="${team}" />${team}`;
      } else {
        item.textContent = team;
      }
      groupList.appendChild(item);
      assignedCount += 1;
      if (sortModal) sortModal.hidden = true;
      document.body.classList.remove("is-blurred");
      sortBtn.disabled = false;
      sortStatus.textContent = "Click Sort to place teams into groups.";
      if (assignedCount >= drawQueue.length) {
        sortBtn.disabled = true;
        sortStatus.textContent = "All teams assigned.";
      }
    }, 3000);
  };

  const buildDrawQueueFromGroups = (groups) => {
    const maxLen = Math.max(...groups.map((g) => g.length));
    const queue = [];
    for (let slot = 0; slot < maxLen; slot += 1) {
      for (let g = 0; g < groups.length; g += 1) {
        const team = groups[g][slot];
        if (team) queue.push(team);
      }
    }
    return queue;
  };

  const tryFetchJson = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load JSON");
    return res.json();
  };

  const findTeamLogo = (name) => {
    const item = teamData.find((t) => t.name === name);
    return item && item.logo ? item.logo : "";
  };

  const fixtureRowHtml = (home, away, roundIndex, groupIndex) => {
    const homeLogo = findTeamLogo(home);
    const awayLogo = findTeamLogo(away);
    const homeLogoHtml = homeLogo
      ? `<img class="fixture-logo" src="${homeLogo}" alt="${home}" />`
      : "";
    const awayLogoHtml = awayLogo
      ? `<img class="fixture-logo" src="${awayLogo}" alt="${away}" />`
      : "";
    return `
      <div class="fixture-row" data-fixture-row data-round="${roundIndex}" data-group="${groupIndex}">
        <div class="fixture-team">
          ${homeLogoHtml}
          <span class="fixture-name">${home}</span>
        </div>
        <div class="fixture-vs">VS</div>
        <div class="fixture-team fixture-team--right">
          <span class="fixture-name">${away}</span>
          ${awayLogoHtml}
        </div>
      </div>
    `;
  };

  const renderFixtures = (data) => {
    if (!fixturesOutput) return;
    fixturesOutput.innerHTML = "";
    if (!data || !data.fixtures) {
      fixturesOutput.innerHTML =
        "<div class='fixture-card'>No fixtures found in JSON.</div>";
      return;
    }
    if (data.fixtures.scope === "same" && Array.isArray(data.fixtures.groups)) {
      data.fixtures.groups.forEach((group, groupIndex) => {
        const card = document.createElement("div");
        card.className = "fixture-card";
        const roundsHtml = group.rounds
          .map((matches, idx) => {
            const items = matches
              .map((m) => fixtureRowHtml(m.home, m.away, idx, groupIndex))
              .join("");
            return `<div class="hint-text">Round ${idx + 1}</div>${items}`;
          })
          .join("");
        card.innerHTML = `<h4>Group ${group.group} Fixtures</h4>${roundsHtml}`;
        fixturesOutput.appendChild(card);
      });
      return;
    }
    if (data.fixtures.scope === "cross" && Array.isArray(data.fixtures.pairs)) {
      data.fixtures.pairs.forEach((pair, pairIndex) => {
        const card = document.createElement("div");
        card.className = "fixture-card";
        const items = pair.matches
          .map((m, idx) => fixtureRowHtml(m.home, m.away, idx, pairIndex))
          .join("");
        card.innerHTML = `<h4>${pair.label}</h4>${items}`;
        fixturesOutput.appendChild(card);
      });
      return;
    }
    fixturesOutput.innerHTML =
      "<div class='fixture-card'>Unsupported fixtures format.</div>";
  };

  const loadData = async () => {
    try {
      let data = null;
      const candidates = [
        "../data/dynamites-data.json",
        "./data/dynamites-data.json",
        "../data/dynamites-data.json",
      ];
      for (const path of candidates) {
        try {
          data = await tryFetchJson(path);
          if (data) break;
        } catch (err) {
          // continue
        }
      }
      if (!data) {
        const stored = localStorage.getItem("dynamitesData");
        if (stored) {
          data = JSON.parse(stored);
        }
      }
      if (!data) throw new Error("No data source available");

      cachedData = data;
      teams = Array.isArray(data.teams) ? data.teams.slice() : [];
      // Randomize team display order each load
      teams = teams.sort(() => Math.random() - 0.5);
      teamData = Array.isArray(data.teamData) ? data.teamData.slice() : [];
      groupCount = data?.settings?.groupCount || data?.groups?.length || 0;
      if (!teams.length || !groupCount) {
        sortStatus.textContent = "Missing team or group data in JSON.";
        return;
      }
      const groupsFromData = Array.isArray(data.groups) ? data.groups : null;
      if (groupsFromData && groupsFromData.length === groupCount) {
        drawQueue = buildDrawQueueFromGroups(groupsFromData);
      } else {
        drawQueue = teams.slice();
      }
      renderTeams();
      renderGroups();
      assignedCount = 0;
      setTimeout(enableSorting, teams.length * 80 + 300);
    } catch (err) {
      sortStatus.textContent =
        "Unable to load JSON data. Run from a local server or export from backend.";
    }
  };

  sortBtn.addEventListener("click", sortNextTeam);
  if (fixturesBtn) {
    fixturesBtn.addEventListener("click", () => {
      if (assignedCount < drawQueue.length) {
        fixturesOutput.innerHTML =
          "<div class='fixture-card'>Please finish the team draw first.</div>";
        return;
      }
      if (flipLine) {
        const text = "LOADING FIXTURES";
        flipLine.innerHTML = "";
        text.split("").forEach((ch, idx) => {
          const span = document.createElement("span");
          span.className = "flip-char";
          span.textContent = ch === " " ? "\u00A0" : ch;
          span.style.animationDelay = `${idx * 90}ms`;
          flipLine.appendChild(span);
        });
        flipLine.classList.add("is-active");
      }
      renderFixtures(cachedData);
      if (fixturesModal) {
        fixturesModal.hidden = false;
      }
      const rows = Array.from(
        fixturesOutput.querySelectorAll("[data-fixture-row]")
      );
      rows.sort((a, b) => {
        const roundA = Number.parseInt(a.dataset.round, 10);
        const roundB = Number.parseInt(b.dataset.round, 10);
        const groupA = Number.parseInt(a.dataset.group, 10);
        const groupB = Number.parseInt(b.dataset.group, 10);
        if (roundA !== roundB) return roundA - roundB;
        return groupA - groupB;
      });
      setTimeout(() => {
        if (fixturesModal) {
          fixturesModal.hidden = true;
        }
        if (flipLine) {
          flipLine.classList.remove("is-active");
        }
      }, 5000);

      rows.forEach((row, index) => {
        setTimeout(() => {
          row.classList.add("is-visible");
        }, 5000 + index * 2000);
      });
    });
  }
  loadData();
});
