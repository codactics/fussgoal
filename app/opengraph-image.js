import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#071510",
          color: "#f8fbf9",
          fontFamily: "Arial, sans-serif",
          padding: "46px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 28,
            background: "linear-gradient(135deg, #0e2f25 0%, #176d4a 58%, #e7f5ea 140%)",
            padding: "48px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -130,
              top: -120,
              width: 460,
              height: 460,
              borderRadius: 230,
              border: "44px solid rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 70,
              bottom: 68,
              width: 300,
              height: 180,
              border: "12px solid rgba(255,255,255,0.34)",
              borderBottom: "none",
              borderRadius: "24px 24px 0 0",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 92,
                height: 92,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                background: "#ffffff",
                color: "#0c4f35",
                fontSize: 50,
                fontWeight: 900,
                boxShadow: "0 18px 44px rgba(0, 0, 0, 0.22)",
              }}
            >
              FG
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#b8efcd",
                }}
              >
                FussGoal
              </div>
              <div style={{ display: "flex", marginTop: 8, fontSize: 30, fontWeight: 800 }}>
                Football Scoreboard Platform
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 840, zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: 0,
              }}
            >
              Live football scores, fixtures and tournament tables
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 32,
                lineHeight: 1.3,
                color: "#dff4e8",
              }}
            >
              Follow matches, standings, brackets and updates in one place.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 26,
              fontWeight: 800,
              color: "#f3fff7",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex" }}>fussgoal.codactics.com</div>
            <div style={{ display: "flex" }}>Fixtures | Standings | Live Scores</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
