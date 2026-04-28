import { ImageResponse } from "next/og";
import { getTournamentBySlug } from "../../../data/tournaments";
import { getNormalizedLaunchedTournamentBySlug } from "../../../lib/site";
import fussgoalLogo from "../../../logo/fussgoal.png";

export const dynamic = "force-dynamic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function buildTournamentImageData(tournament) {
  if (!tournament) {
    return {
      name: "FussGoal",
      status: "Football Tournament",
      detail: "Fixtures, standings and live scores",
      matches: "Live football scoreboard",
    };
  }

  return {
    name: tournament.name || "Football Tournament",
    status: tournament.status || "Tournament",
    detail:
      tournament.tournamentType === "league"
        ? "League fixtures, table and results"
        : "Group fixtures, standings and results",
    matches: `${tournament.matches || 0} matches`,
  };
}

export default async function OpengraphImage({ params }) {
  const { slug } = await params;
  const tournament = slug.startsWith("launched-")
    ? await getNormalizedLaunchedTournamentBySlug(slug)
    : getTournamentBySlug(slug);
  const imageData = buildTournamentImageData(tournament);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #071510 0%, #0f4f38 55%, #dff2e7 140%)",
          color: "#f7fbf8",
          padding: "44px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "34px",
            border: "1px solid rgba(247, 251, 248, 0.16)",
            background: "rgba(5, 18, 14, 0.2)",
            padding: "44px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  width: 144,
                  height: 144,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 30,
                  background: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 20px 44px rgba(0, 0, 0, 0.22)",
                }}
              >
                <img
                  alt="FussGoal logo"
                  src={fussgoalLogo.src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#a8e0c1",
                  }}
                >
                  FussGoal
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 8,
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#dff4e8",
                  }}
                >
                  Tournament Hub
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                padding: "14px 24px",
                borderRadius: 999,
                background: "rgba(168, 224, 193, 0.16)",
                color: "#effbf4",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {imageData.status}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 950 }}>
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: 0,
              }}
            >
              {imageData.name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 32,
                lineHeight: 1.35,
                color: "#d5ebe0",
              }}
            >
              {imageData.detail}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#e9f7ef",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex" }}>Fixtures | Standings | Live Scores</div>
            <div style={{ display: "flex" }}>{imageData.matches}</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
