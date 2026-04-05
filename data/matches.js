export const matches = [
  {
    id: 1,
    slug: "ucl-real-madrid-vs-bayern-munich-001",
    tournamentSlug: "uefa-champions-league",
    homeTeam: "Real Madrid",
    awayTeam: "Bayern Munich",
    homeScore: 2,
    awayScore: 1,
    status: "LIVE",
    minute: "67'",
    venue: "Santiago Bernabeu",
    tournament: "UEFA Champions League",
    date: "2026-02-14",
    events: [
      { id: 1, minute: "12'", type: "Goal", team: "Real Madrid", player: "Vinicius Jr." },
      { id: 2, minute: "25'", type: "Yellow Card", team: "Bayern Munich", player: "Kimmich" },
      { id: 3, minute: "49'", type: "Goal", team: "Bayern Munich", player: "Harry Kane" },
      {
        id: 4,
        minute: "61'",
        type: "Substitution",
        team: "Real Madrid",
        outPlayer: "Bale",
        inPlayer: "Rodrygo"
      },
      { id: 5, minute: "67'", type: "Goal", team: "Real Madrid", player: "Bellingham" }
    ]
  },
  {
    id: 2,
    slug: "ucl-arsenal-vs-inter-milan-002",
    tournamentSlug: "uefa-champions-league",
    homeTeam: "Arsenal",
    awayTeam: "Inter Milan",
    homeScore: 1,
    awayScore: 0,
    status: "LIVE",
    minute: "54'",
    venue: "Emirates Stadium",
    tournament: "UEFA Champions League",
    date: "2026-02-14",
    events: [
      { id: 1, minute: "18'", type: "Yellow Card", team: "Inter Milan", player: "Barella" },
      { id: 2, minute: "39'", type: "Goal", team: "Arsenal", player: "Saka" },
      {
        id: 3,
        minute: "54'",
        type: "Substitution",
        team: "Inter Milan",
        outPlayer: "Mkhitaryan",
        inPlayer: "Frattesi"
      }
    ]
  },
  {
    id: 3,
    slug: "ucl-psg-vs-manchester-city-003",
    tournamentSlug: "uefa-champions-league",
    homeTeam: "PSG",
    awayTeam: "Manchester City",
    homeScore: 0,
    awayScore: 0,
    status: "HT",
    minute: "",
    venue: "Parc des Princes",
    tournament: "UEFA Champions League",
    date: "2026-02-14",
    events: [
      { id: 1, minute: "11'", type: "Yellow Card", team: "Manchester City", player: "Rodri" },
      { id: 2, minute: "34'", type: "Red Card", team: "PSG", player: "Hakimi" }
    ]
  },
  {
    id: 4,
    slug: "epl-liverpool-vs-chelsea-004",
    tournamentSlug: "premier-league",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    homeScore: 3,
    awayScore: 2,
    status: "LIVE",
    minute: "73'",
    venue: "Anfield",
    tournament: "Premier League",
    date: "2026-03-02",
    events: [
      { id: 1, minute: "9'", type: "Goal", team: "Liverpool", player: "Salah" },
      { id: 2, minute: "21'", type: "Goal", team: "Chelsea", player: "Palmer" },
      { id: 3, minute: "58'", type: "Goal", team: "Liverpool", player: "Nunez" },
      { id: 4, minute: "73'", type: "Goal", team: "Chelsea", player: "Jackson" }
    ]
  },
  {
    id: 5,
    slug: "epl-tottenham-vs-newcastle-united-005",
    tournamentSlug: "premier-league",
    homeTeam: "Tottenham",
    awayTeam: "Newcastle United",
    homeScore: 1,
    awayScore: 1,
    status: "LIVE",
    minute: "54'",
    venue: "Tottenham Hotspur Stadium",
    tournament: "Premier League",
    date: "2026-03-02",
    events: [
      { id: 1, minute: "14'", type: "Goal", team: "Tottenham", player: "Son" },
      { id: 2, minute: "28'", type: "Yellow Card", team: "Newcastle United", player: "Guimaraes" },
      { id: 3, minute: "47'", type: "Goal", team: "Newcastle United", player: "Isak" }
    ]
  },
  {
    id: 6,
    slug: "epl-manchester-united-vs-brighton-006",
    tournamentSlug: "premier-league",
    homeTeam: "Manchester United",
    awayTeam: "Brighton",
    homeScore: 0,
    awayScore: 1,
    status: "FT",
    minute: "",
    venue: "Old Trafford",
    tournament: "Premier League",
    date: "2026-03-02",
    events: [
      { id: 1, minute: "32'", type: "Goal", team: "Brighton", player: "Joao Pedro" },
      { id: 2, minute: "71'", type: "Yellow Card", team: "Manchester United", player: "Martinez" }
    ]
  },
  {
    id: 7,
    slug: "laliga-barcelona-vs-atletico-madrid-007",
    tournamentSlug: "la-liga",
    homeTeam: "Barcelona",
    awayTeam: "Atletico Madrid",
    homeScore: 2,
    awayScore: 2,
    status: "LIVE",
    minute: "81'",
    venue: "Estadi Olimpic Lluis Companys",
    tournament: "La Liga",
    date: "2026-03-08",
    events: [
      { id: 1, minute: "17'", type: "Goal", team: "Barcelona", player: "Lewandowski" },
      { id: 2, minute: "29'", type: "Goal", team: "Atletico Madrid", player: "Griezmann" },
      { id: 3, minute: "63'", type: "Goal", team: "Barcelona", player: "Pedri" },
      { id: 4, minute: "81'", type: "Goal", team: "Atletico Madrid", player: "Morata" }
    ]
  },
  {
    id: 8,
    slug: "laliga-sevilla-vs-real-sociedad-008",
    tournamentSlug: "la-liga",
    homeTeam: "Sevilla",
    awayTeam: "Real Sociedad",
    homeScore: 1,
    awayScore: 0,
    status: "LIVE",
    minute: "79'",
    venue: "Ramon Sanchez-Pizjuan",
    tournament: "La Liga",
    date: "2026-03-08",
    events: [
      { id: 1, minute: "23'", type: "Yellow Card", team: "Real Sociedad", player: "Zubimendi" },
      { id: 2, minute: "52'", type: "Goal", team: "Sevilla", player: "En-Nesyri" }
    ]
  },
  {
    id: 9,
    slug: "laliga-villarreal-vs-athletic-club-009",
    tournamentSlug: "la-liga",
    homeTeam: "Villarreal",
    awayTeam: "Athletic Club",
    homeScore: 0,
    awayScore: 0,
    status: "HT",
    minute: "",
    venue: "Estadio de la Ceramica",
    tournament: "La Liga",
    date: "2026-03-08",
    events: [
      { id: 1, minute: "8'", type: "Yellow Card", team: "Villarreal", player: "Parejo" },
      {
        id: 2,
        minute: "37'",
        type: "Substitution",
        team: "Athletic Club",
        outPlayer: "Sancet",
        inPlayer: "Williams"
      }
    ]
  }
];

export function getMatchesByTournamentSlug(tournamentSlug) {
  return matches.filter((match) => match.tournamentSlug === tournamentSlug);
}

export function getMatchBySlug(slug) {
  return matches.find((match) => match.slug === slug);
}
