export const ongoingTournaments = [
  {
    id: 1,
    name: "UEFA Champions League",
    slug: "uefa-champions-league",
    matches: 16,
    status: "Ongoing",
    description: "Top European club competition.",
    fixtures: [
      {
        id: 1,
        slug: "ucl-arsenal-vs-inter-002",
        homeTeam: "Arsenal",
        awayTeam: "Inter Milan",
        date: "2026-02-16",
        time: "20:00",
        status: "Scheduled",
      },
      {
        id: 2,
        slug: "ucl-psg-vs-manchester-city-003",
        homeTeam: "PSG",
        awayTeam: "Manchester City",
        date: "2026-02-17",
        time: "21:00",
        status: "Upcoming",
      },
      {
        id: 3,
        slug: "ucl-real-madrid-vs-bayern-004",
        homeTeam: "Real Madrid",
        awayTeam: "Bayern Munich",
        date: "2026-02-18",
        time: "20:30",
        status: "Scheduled",
      },
    ],
    groups: [
      {
        name: "Group A",
        teams: ["Real Madrid", "Bayern Munich", "Arsenal", "Inter Milan"],
      },
      {
        name: "Group B",
        teams: ["PSG", "Manchester City", "Benfica", "Napoli"],
      },
      {
        name: "Group C",
        teams: ["Barcelona", "AC Milan", "Porto", "RB Leipzig"],
      },
    ],
    pointsTables: [
      {
        name: "Group A",
        rows: [
          { position: 1, team: "Real Madrid", played: 3, won: 2, draw: 1, lost: 0, goalDifference: 5, points: 7 },
          { position: 2, team: "Bayern Munich", played: 3, won: 2, draw: 0, lost: 1, goalDifference: 3, points: 6 },
          { position: 3, team: "Arsenal", played: 3, won: 1, draw: 1, lost: 1, goalDifference: 1, points: 4 },
          { position: 4, team: "Inter Milan", played: 3, won: 0, draw: 0, lost: 3, goalDifference: -9, points: 0 },
        ],
      },
      {
        name: "Group B",
        rows: [
          { position: 1, team: "PSG", played: 3, won: 2, draw: 1, lost: 0, goalDifference: 4, points: 7 },
          { position: 2, team: "Manchester City", played: 3, won: 2, draw: 0, lost: 1, goalDifference: 3, points: 6 },
          { position: 3, team: "Benfica", played: 3, won: 1, draw: 0, lost: 2, goalDifference: -1, points: 3 },
          { position: 4, team: "Napoli", played: 3, won: 0, draw: 1, lost: 2, goalDifference: -6, points: 1 },
        ],
      },
      {
        name: "Group C",
        rows: [
          { position: 1, team: "Barcelona", played: 3, won: 2, draw: 1, lost: 0, goalDifference: 6, points: 7 },
          { position: 2, team: "AC Milan", played: 3, won: 2, draw: 0, lost: 1, goalDifference: 2, points: 6 },
          { position: 3, team: "Porto", played: 3, won: 1, draw: 1, lost: 1, goalDifference: 0, points: 4 },
          { position: 4, team: "RB Leipzig", played: 3, won: 0, draw: 0, lost: 3, goalDifference: -8, points: 0 },
        ],
      },
      {
        name: "Group D",
        rows: [
          { position: 1, team: "Juventus", played: 3, won: 2, draw: 1, lost: 0, goalDifference: 5, points: 7 },
          { position: 2, team: "Atletico Madrid", played: 3, won: 2, draw: 0, lost: 1, goalDifference: 2, points: 6 },
          { position: 3, team: "Dortmund", played: 3, won: 1, draw: 0, lost: 2, goalDifference: -1, points: 3 },
          { position: 4, team: "Celtic", played: 3, won: 0, draw: 1, lost: 2, goalDifference: -6, points: 1 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Premier League",
    slug: "premier-league",
    matches: 10,
    status: "Ongoing",
    description: "England's top-flight football league.",
    fixtures: [
      {
        id: 1,
        slug: "epl-aston-villa-vs-west-ham-001",
        homeTeam: "Aston Villa",
        awayTeam: "West Ham",
        date: "2026-03-05",
        time: "18:30",
        status: "Scheduled",
      },
      {
        id: 2,
        slug: "epl-arsenal-vs-chelsea-002",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        date: "2026-03-06",
        time: "20:00",
        status: "Upcoming",
      },
      {
        id: 3,
        slug: "epl-liverpool-vs-newcastle-003",
        homeTeam: "Liverpool",
        awayTeam: "Newcastle United",
        date: "2026-03-07",
        time: "19:45",
        status: "Scheduled",
      },
    ],
    groups: [
      {
        name: "Top Contenders",
        teams: ["Liverpool", "Arsenal", "Manchester City", "Chelsea"],
      },
      {
        name: "Mid Table",
        teams: ["Brighton", "Tottenham", "Newcastle United", "Aston Villa"],
      },
      {
        name: "Chasing Form",
        teams: ["Manchester United", "West Ham", "Everton", "Wolves"],
      },
    ],
    pointsTables: [
      {
        name: "Group A",
        rows: [
          { position: 1, team: "Liverpool", played: 28, won: 19, draw: 5, lost: 4, goalDifference: 28, points: 62 },
          { position: 2, team: "Arsenal", played: 28, won: 18, draw: 6, lost: 4, goalDifference: 24, points: 60 },
          { position: 3, team: "Manchester City", played: 28, won: 17, draw: 7, lost: 4, goalDifference: 21, points: 58 },
          { position: 4, team: "Chelsea", played: 28, won: 16, draw: 6, lost: 6, goalDifference: 14, points: 54 },
        ],
      },
      {
        name: "Group B",
        rows: [
          { position: 1, team: "Tottenham", played: 28, won: 15, draw: 7, lost: 6, goalDifference: 12, points: 52 },
          { position: 2, team: "Newcastle United", played: 28, won: 15, draw: 5, lost: 8, goalDifference: 9, points: 50 },
          { position: 3, team: "Brighton", played: 28, won: 13, draw: 8, lost: 7, goalDifference: 7, points: 47 },
          { position: 4, team: "Aston Villa", played: 28, won: 12, draw: 7, lost: 9, goalDifference: 3, points: 43 },
        ],
      },
      {
        name: "Group C",
        rows: [
          { position: 1, team: "Manchester United", played: 28, won: 12, draw: 6, lost: 10, goalDifference: 1, points: 42 },
          { position: 2, team: "West Ham", played: 28, won: 11, draw: 7, lost: 10, goalDifference: -2, points: 40 },
          { position: 3, team: "Everton", played: 28, won: 10, draw: 8, lost: 10, goalDifference: -4, points: 38 },
          { position: 4, team: "Wolves", played: 28, won: 10, draw: 6, lost: 12, goalDifference: -6, points: 36 },
        ],
      },
      {
        name: "Group D",
        rows: [
          { position: 1, team: "Brentford", played: 28, won: 9, draw: 8, lost: 11, goalDifference: -5, points: 35 },
          { position: 2, team: "Crystal Palace", played: 28, won: 8, draw: 9, lost: 11, goalDifference: -7, points: 33 },
          { position: 3, team: "Fulham", played: 28, won: 8, draw: 7, lost: 13, goalDifference: -10, points: 31 },
          { position: 4, team: "Burnley", played: 28, won: 6, draw: 6, lost: 16, goalDifference: -18, points: 24 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "La Liga",
    slug: "la-liga",
    matches: 8,
    status: "Ongoing",
    description: "Spain's premier football competition.",
    fixtures: [
      {
        id: 1,
        slug: "laliga-valencia-vs-sevilla-001",
        homeTeam: "Valencia",
        awayTeam: "Sevilla",
        date: "2026-03-10",
        time: "19:00",
        status: "Scheduled",
      },
      {
        id: 2,
        slug: "laliga-barcelona-vs-villarreal-002",
        homeTeam: "Barcelona",
        awayTeam: "Villarreal",
        date: "2026-03-11",
        time: "20:30",
        status: "Upcoming",
      },
      {
        id: 3,
        slug: "laliga-real-madrid-vs-athletic-club-003",
        homeTeam: "Real Madrid",
        awayTeam: "Athletic Club",
        date: "2026-03-12",
        time: "21:00",
        status: "Scheduled",
      },
    ],
    groups: [
      {
        name: "Group A",
        teams: ["Barcelona", "Atletico Madrid", "Sevilla", "Villarreal"],
      },
      {
        name: "Group B",
        teams: ["Real Madrid", "Athletic Club", "Real Sociedad", "Valencia"],
      },
      {
        name: "Group C",
        teams: ["Real Betis", "Girona", "Osasuna", "Mallorca"],
      },
    ],
    pointsTables: [
      {
        name: "Group A",
        rows: [
          { position: 1, team: "Barcelona", played: 26, won: 18, draw: 5, lost: 3, goalDifference: 26, points: 59 },
          { position: 2, team: "Real Madrid", played: 26, won: 18, draw: 4, lost: 4, goalDifference: 24, points: 58 },
          { position: 3, team: "Atletico Madrid", played: 26, won: 16, draw: 6, lost: 4, goalDifference: 18, points: 54 },
          { position: 4, team: "Athletic Club", played: 26, won: 14, draw: 7, lost: 5, goalDifference: 12, points: 49 },
        ],
      },
      {
        name: "Group B",
        rows: [
          { position: 1, team: "Sevilla", played: 26, won: 13, draw: 7, lost: 6, goalDifference: 8, points: 46 },
          { position: 2, team: "Real Sociedad", played: 26, won: 12, draw: 8, lost: 6, goalDifference: 6, points: 44 },
          { position: 3, team: "Valencia", played: 26, won: 11, draw: 7, lost: 8, goalDifference: 2, points: 40 },
          { position: 4, team: "Villarreal", played: 26, won: 10, draw: 8, lost: 8, goalDifference: 0, points: 38 },
        ],
      },
      {
        name: "Group C",
        rows: [
          { position: 1, team: "Real Betis", played: 26, won: 11, draw: 8, lost: 7, goalDifference: 3, points: 41 },
          { position: 2, team: "Girona", played: 26, won: 11, draw: 6, lost: 9, goalDifference: 1, points: 39 },
          { position: 3, team: "Osasuna", played: 26, won: 10, draw: 7, lost: 9, goalDifference: -2, points: 37 },
          { position: 4, team: "Mallorca", played: 26, won: 8, draw: 8, lost: 10, goalDifference: -5, points: 32 },
        ],
      },
      {
        name: "Group D",
        rows: [
          { position: 1, team: "Celta Vigo", played: 26, won: 9, draw: 7, lost: 10, goalDifference: -3, points: 34 },
          { position: 2, team: "Getafe", played: 26, won: 8, draw: 9, lost: 9, goalDifference: -4, points: 33 },
          { position: 3, team: "Espanyol", played: 26, won: 8, draw: 7, lost: 11, goalDifference: -8, points: 31 },
          { position: 4, team: "Alaves", played: 26, won: 7, draw: 8, lost: 11, goalDifference: -10, points: 29 },
        ],
      },
    ],
  },
];

export function getTournamentBySlug(slug) {
  return ongoingTournaments.find((tournament) => tournament.slug === slug);
}
