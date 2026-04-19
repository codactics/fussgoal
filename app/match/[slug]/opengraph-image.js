import { ImageResponse } from "next/og";
import { getMatchBySlug } from "../../../data/matches";
import { getNormalizedLaunchedMatchBySlug } from "../../../lib/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function buildImageMatchData(launchedMatch, staticMatch) {
  if (launchedMatch?.fixture && launchedMatch?.tournament) {
    return {
      tournamentName: launchedMatch.tournament.name,
      homeTeam: launchedMatch.fixture.homeTeam,
      awayTeam: launchedMatch.fixture.awayTeam,
      homeScore: launchedMatch.fixture.score?.home ?? 0,
      awayScore: launchedMatch.fixture.score?.away ?? 0,
      status: launchedMatch.fixture.status || "Live Match",
      detail: `${launchedMatch.fixture.date || "TBD"}${launchedMatch.fixture.time ? ` at ${launchedMatch.fixture.time}` : ""}`,
    };
  }

  if (staticMatch) {
    return {
      tournamentName: staticMatch.tournament,
      homeTeam: staticMatch.homeTeam,
      awayTeam: staticMatch.awayTeam,
      homeScore: staticMatch.homeScore ?? 0,
      awayScore: staticMatch.awayScore ?? 0,
      status: staticMatch.status || "Match Overview",
      detail: `${staticMatch.date || "TBD"}${staticMatch.minute ? ` | ${staticMatch.minute}` : ""}`,
    };
  }

  return {
    tournamentName: "FussGoal",
    homeTeam: "Match",
    awayTeam: "Unavailable",
    homeScore: 0,
    awayScore: 0,
    status: "Shared Match",
    detail: "Live football scoreboard",
  };
}

export default async function OpengraphImage({ params }) {
  const { slug } = await params;
  const launchedMatch = await getNormalizedLaunchedMatchBySlug(slug);
  const staticMatch = launchedMatch ? null : getMatchBySlug(slug);
  const match = buildImageMatchData(launchedMatch, staticMatch);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #081b16 0%, #0d3a2d 48%, #d8eadf 140%)",
          color: "#f7fbf8",
          padding: "44px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            borderRadius: "32px",
            border: "1px solid rgba(247, 251, 248, 0.14)",
            background: "rgba(7, 16, 13, 0.18)",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "#9fd4b8",
                }}
              >
                FussGoal
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                  marginTop: 10,
                  maxWidth: 760,
                }}
              >
                {match.tournamentName}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 22px",
                borderRadius: 999,
                background: "rgba(159, 212, 184, 0.14)",
                color: "#dff4e8",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {match.status}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 360,
              }}
            >
              <div style={{ display: "flex", fontSize: 54, fontWeight: 800, lineHeight: 1.05 }}>
                {match.homeTeam}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                padding: "20px 28px",
                borderRadius: 28,
                background: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ display: "flex", fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
                {String(match.homeScore)}
              </div>
              <div style={{ display: "flex", fontSize: 72, fontWeight: 700, opacity: 0.72 }}>
                -
              </div>
              <div style={{ display: "flex", fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
                {String(match.awayScore)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 360,
                alignItems: "flex-end",
                textAlign: "right",
              }}
            >
              <div style={{ display: "flex", fontSize: 54, fontWeight: 800, lineHeight: 1.05 }}>
                {match.awayTeam}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#d5ebe0",
              fontSize: 24,
            }}
          >
            <div style={{ display: "flex" }}>Live football scoreboard</div>
            <div style={{ display: "flex" }}>{match.detail}</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
