import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "NamoLux — AI Domain Name Generator"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold radial glow behind logo */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 50%, transparent 75%)",
          }}
        />

        {/* Top gold accent line */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "3px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(212,175,55,0.4) 25%, #D4AF37 50%, rgba(212,175,55,0.4) 75%, transparent 100%)",
          }}
        />

        {/* N lettermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "96px",
            height: "96px",
            borderRadius: "20px",
            background: "#0A0A0A",
            border: "1.5px solid rgba(212,175,55,0.35)",
            marginBottom: "36px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width="60"
            height="60"
          >
            <defs>
              <linearGradient id="g" x1="20" y1="22" x2="80" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F6E27A" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#B8972E" />
              </linearGradient>
            </defs>
            <path d="M20 78V22H34V54L66 22H80V78H66V46L34 78H20Z" fill="url(#g)" />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0px",
            marginBottom: "20px",
            fontFamily: "sans-serif",
            fontSize: "72px",
            fontWeight: "900",
            letterSpacing: "-2px",
          }}
        >
          <span style={{ color: "#ffffff" }}>Namo</span>
          <span
            style={{
              background: "linear-gradient(135deg, #F6E27A 0%, #D4AF37 50%, #B8972E 100%)",
              backgroundClip: "text",
              color: "transparent",
              WebkitBackgroundClip: "text",
            }}
          >
            Lux
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "sans-serif",
            fontSize: "22px",
            fontWeight: "400",
            letterSpacing: "0.5px",
            textAlign: "center",
            maxWidth: "560px",
          }}
        >
          AI Domain Names Scored by Founder Signal™
        </div>

        {/* Gold pill badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "36px",
            padding: "10px 28px",
            borderRadius: "100px",
            background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.25)",
            color: "#D4AF37",
            fontFamily: "sans-serif",
            fontSize: "15px",
            fontWeight: "600",
            letterSpacing: "1px",
          }}
        >
          NAMOLUX.COM
        </div>

        {/* Bottom gold accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(212,175,55,0.25) 30%, rgba(212,175,55,0.5) 50%, rgba(212,175,55,0.25) 70%, transparent 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
