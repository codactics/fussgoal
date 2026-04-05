export function shuffleArray(array) {
  const result = array.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function buildGroups({ teams, groupCount, unevenMode, assignMode, manualGroups = [] }) {
  const groups = Array.from({ length: groupCount }, () => []);

  if (assignMode === "manual") {
    teams.forEach((team, index) => {
      const groupIndex = Number.parseInt(manualGroups[index], 10);
      if (!Number.isNaN(groupIndex) && groupIndex >= 0 && groupIndex < groupCount) {
        groups[groupIndex].push(team);
      }
    });
    return groups;
  }

  let order = Array.from({ length: groupCount }, (_, index) => index);

  if (unevenMode === "balanced") {
    order = shuffleArray(order);
  }

  if (unevenMode === "fill-first") {
    const baseSize = Math.floor(teams.length / groupCount);
    const remainder = teams.length % groupCount;
    let cursor = 0;

    order.forEach((groupIndex, index) => {
      const targetSize = index < remainder ? baseSize + 1 : baseSize;

      for (let count = 0; count < targetSize; count += 1) {
        if (cursor >= teams.length) {
          break;
        }

        groups[groupIndex].push(teams[cursor]);
        cursor += 1;
      }
    });

    return groups;
  }

  teams.forEach((team, index) => {
    const groupIndex = order[index % groupCount];
    groups[groupIndex].push(team);
  });

  return groups;
}

export function generateRoundRobin(teams) {
  const list = teams.slice();

  if (list.length % 2 === 1) {
    list.push("BYE");
  }

  const rounds = [];
  const totalRounds = list.length - 1;
  const half = list.length / 2;

  for (let round = 0; round < totalRounds; round += 1) {
    const matches = [];

    for (let index = 0; index < half; index += 1) {
      const home = list[index];
      const away = list[list.length - 1 - index];

      if (home !== "BYE" && away !== "BYE") {
        matches.push([home, away]);
      }
    }

    rounds.push(matches);

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }

  return { rounds };
}

function sharesTeam(matchA, matchB) {
  if (!matchA || !matchB) {
    return false;
  }

  return (
    matchA[0] === matchB[0] ||
    matchA[0] === matchB[1] ||
    matchA[1] === matchB[0] ||
    matchA[1] === matchB[1]
  );
}

export function orderMatchesStrict(matches, prevMatch = null) {
  if (matches.length === 0) {
    return matches.slice();
  }

  if (matches.length === 1) {
    if (prevMatch && sharesTeam(prevMatch, matches[0])) {
      return null;
    }

    return matches.slice();
  }

  const maxNodes = 50000;
  let nodes = 0;
  const used = new Array(matches.length).fill(false);
  const result = [];

  const conflictScores = matches.map((match, index) => {
    let score = 0;

    for (let compareIndex = 0; compareIndex < matches.length; compareIndex += 1) {
      if (index !== compareIndex && sharesTeam(match, matches[compareIndex])) {
        score += 1;
      }
    }

    return score;
  });

  const candidates = matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => conflictScores[b.index] - conflictScores[a.index]);

  function dfs(lastMatch) {
    if (nodes > maxNodes) {
      return false;
    }

    if (result.length === matches.length) {
      return true;
    }

    nodes += 1;

    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const { index, match } = candidates[candidateIndex];

      if (used[index] || sharesTeam(lastMatch, match)) {
        continue;
      }

      used[index] = true;
      result.push(match);

      if (dfs(match)) {
        return true;
      }

      result.pop();
      used[index] = false;
    }

    return false;
  }

  return dfs(prevMatch) ? result : null;
}

export function arrangeRoundsNoBackToBack(rounds, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const shuffledRounds = shuffleArray(rounds);
    const arrangedRounds = [];
    let previousMatch = null;
    let valid = true;

    for (let roundIndex = 0; roundIndex < shuffledRounds.length; roundIndex += 1) {
      const arrangedMatches = orderMatchesStrict(shuffledRounds[roundIndex], previousMatch);

      if (!arrangedMatches) {
        valid = false;
        break;
      }

      arrangedRounds.push(arrangedMatches);
      previousMatch = arrangedMatches[arrangedMatches.length - 1] || previousMatch;
    }

    if (valid) {
      return arrangedRounds;
    }
  }

  return null;
}

export function buildCrossGroupFixtures(groups, homeAway) {
  const fixtures = [];

  for (let leftIndex = 0; leftIndex < groups.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex += 1) {
      const leftGroup = groups[leftIndex];
      const rightGroup = groups[rightIndex];

      if (leftGroup.length === 0 || rightGroup.length === 0) {
        continue;
      }

      let matches = [];

      leftGroup.forEach((home) => {
        rightGroup.forEach((away) => {
          matches.push([home, away]);

          if (homeAway) {
            matches.push([away, home]);
          }
        });
      });

      matches = orderMatchesStrict(matches) || matches;

      fixtures.push({
        label: `Group ${String.fromCharCode(65 + leftIndex)} vs Group ${String.fromCharCode(
          65 + rightIndex
        )}`,
        matches,
      });
    }
  }

  return fixtures;
}
