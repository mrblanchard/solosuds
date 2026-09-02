import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SoloSuds: Practice Management Software for Solo Practitioners";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#ffffff",
          backgroundImage:
            "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #ede9fe 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              backgroundColor: "#4f46e5",
              color: "white",
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: "34px", fontWeight: 800, color: "#1f2937" }}>
            SoloSuds
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "58px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#1f2937",
            maxWidth: "980px",
          }}
        >
          <span>Write your notes.</span>
          <span style={{ color: "#4f46e5" }}>Schedule your clients.</span>
          <span style={{ color: "#4f46e5" }}>Run your practice.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "36px",
            fontSize: "26px",
            color: "#4b5563",
          }}
        >
          Practice management software for solo healthcare practitioners
        </div>
      </div>
    ),
    { ...size }
  );
}
