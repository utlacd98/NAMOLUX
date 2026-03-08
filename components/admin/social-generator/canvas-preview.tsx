"use client"

import { forwardRef } from "react"
import type { PostConfig } from "./types"
import { PLATFORMS, PREVIEW_WIDTH } from "./types"

interface TemplateProps {
  config: PostConfig
  w: number  // preview canvas width  (px)
  h: number  // preview canvas height (px)
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function GoldRule({ w, style }: { w?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: "2px",
        width: w ?? "100%",
        background:
          "linear-gradient(to right, transparent, #D4AF37 20%, #F6E27A 50%, #D4AF37 80%, transparent)",
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

function NamoLogo({ size, accent }: { size: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <div
        style={{
          width: size * 1.4,
          height: size * 1.4,
          borderRadius: size * 0.25,
          background: `linear-gradient(135deg, ${accent}, #F6E27A)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: size * 0.9,
          color: "#000",
          fontFamily: "Arial Black, Arial, sans-serif",
          flexShrink: 0,
        }}
      >
        N
      </div>
      <span
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize: size,
          fontFamily: "Arial Black, Arial, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        Namo
        <span
          style={{
            background: `linear-gradient(135deg, ${accent}, #F6E27A)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Lux
        </span>
      </span>
    </div>
  )
}

function PhoneFrame({
  screenshot,
  width,
  height,
}: {
  screenshot?: string
  width: number
  height: number
}) {
  const border = Math.max(5, Math.round(width * 0.045))
  const radius = Math.round(width * 0.16)
  const notchW = Math.round(width * 0.38)
  const notchH = Math.round(width * 0.1)

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        border: `${border}px solid rgba(255,255,255,0.88)`,
        background: "#0e0e14",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: notchW,
          height: notchH,
          borderRadius: `0 0 ${notchH}px ${notchH}px`,
          background: "rgba(255,255,255,0.88)",
          zIndex: 10,
        }}
      />
      {/* Screen */}
      {screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt="screenshot"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <PlaceholderScreen width={width} height={height} />
      )}
    </div>
  )
}

function PlaceholderScreen({ width, height }: { width: number; height: number }) {
  const p = width * 0.12
  const r = width * 0.08
  const row = height * 0.07
  const gap = height * 0.025
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #131318 0%, #0c0c11 100%)",
        padding: `${p * 1.4}px ${p}px ${p}px`,
        display: "flex",
        flexDirection: "column",
        gap,
        boxSizing: "border-box",
      }}
    >
      {/* Gold bar */}
      <div
        style={{
          width: "75%",
          height: row * 0.6,
          borderRadius: r,
          background: "linear-gradient(90deg, #D4AF37, #F6E27A)",
          marginBottom: gap,
        }}
      />
      {/* Grey bars */}
      {[80, 60, 70, 60, 70, 55].map((pct, i) => (
        <div
          key={i}
          style={{
            width: `${pct}%`,
            height: i === 3 ? row * 0.9 : row * 0.55,
            borderRadius: r * 0.6,
            background: i === 3 ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.07)",
            border: i === 3 ? "1px solid rgba(212,175,55,0.2)" : "none",
          }}
        />
      ))}
      <div
        style={{
          width: "80%",
          height: row,
          borderRadius: r,
          background: "linear-gradient(135deg, #D4AF37, #F6E27A)",
          marginTop: "auto",
        }}
      />
    </div>
  )
}

// ─── Template A — Product Showcase ───────────────────────────────────────────
function TemplateA({ config, w, h }: TemplateProps) {
  // Responsive font scale based on canvas dimensions
  const hs = Math.round(w * (config.headlineFontSize / 520))
  const bs = Math.round(w * (config.bodyFontSize / 520))
  const pad = Math.round(w * 0.05)

  // Phone dimensions: fit into content area
  const contentH = h - pad * 2 - hs * 2.4 - 20 - 24 // rough content row height
  const phoneH = Math.max(80, Math.min(contentH * 0.95, h * 0.48))
  const phoneW = Math.round(phoneH / 2.1)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${pad}px ${pad}px ${pad * 0.8}px`,
        boxSizing: "border-box",
        fontFamily: "Arial Black, Arial, sans-serif",
      }}
    >
      {/* Gold radial glow — top right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "65%",
          height: "60%",
          background:
            "radial-gradient(ellipse at 88% 8%, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.08) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Subtle bottom vignette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Headline */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: hs,
          fontWeight: 900,
          lineHeight: 1.08,
          textTransform: "uppercase",
          letterSpacing: "-0.025em",
          margin: 0,
          marginBottom: Math.round(h * 0.035),
          position: "relative",
          zIndex: 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {config.headline}
      </h1>

      {/* Gold rule */}
      <GoldRule style={{ marginBottom: Math.round(h * 0.04) }} />

      {/* Content row — fills remaining space */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: Math.round(w * 0.04),
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Features list */}
        <div
          style={{
            flex: "0 0 44%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: Math.round(h * 0.025),
          }}
        >
          {config.features.slice(0, 4).map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: Math.round(bs * 0.7),
              }}
            >
              <span
                style={{
                  color: config.accentColor,
                  fontSize: bs * 0.9,
                  lineHeight: 1.5,
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                ✦
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.88)",
                  fontSize: bs,
                  lineHeight: 1.45,
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 500,
                }}
              >
                {f}
              </span>
            </div>
          ))}
        </div>

        {/* Phone mockups */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.round(phoneW * (-0.18)), // slight overlap
            paddingTop: Math.round(phoneH * 0.05),
          }}
        >
          <div style={{ marginTop: Math.round(phoneH * 0.06) }}>
            <PhoneFrame
              screenshot={config.screenshots[0]}
              width={phoneW}
              height={phoneH}
            />
          </div>
          <div style={{ marginTop: 0, zIndex: 2 }}>
            <PhoneFrame
              screenshot={config.screenshots[1]}
              width={Math.round(phoneW * 0.88)}
              height={Math.round(phoneH * 0.88)}
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: Math.round(h * 0.03),
          display: "flex",
          alignItems: "center",
          gap: Math.round(bs * 0.6),
        }}
      >
        <GoldRule style={{ width: Math.round(w * 0.12), flexShrink: 0 }} />
        <span
          style={{
            color: config.accentColor,
            fontSize: Math.round(bs * 1.05),
            fontWeight: 800,
            letterSpacing: "0.04em",
            fontFamily: "Arial Black, Arial, sans-serif",
          }}
        >
          {config.ctaText}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: Math.round(bs * 1.05),
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          }}
        >
          {config.ctaUrl}
        </span>
      </div>
    </div>
  )
}

// ─── Template B — Name Spotlight ─────────────────────────────────────────────
function TemplateB({ config, w, h }: TemplateProps) {
  const hs = Math.round(w * (config.headlineFontSize / 520))
  const bs = Math.round(w * (config.bodyFontSize / 520))
  const pad = Math.round(w * 0.07)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${pad}px`,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}1A 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      {/* Top border accent */}
      <GoldRule
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
        }}
      />

      {/* Label pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: bs * 0.4,
          background: `${config.accentColor}15`,
          border: `1px solid ${config.accentColor}30`,
          borderRadius: 100,
          padding: `${bs * 0.25}px ${bs * 0.8}px`,
          marginBottom: h * 0.03,
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: config.accentColor,
            fontSize: bs * 0.7,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          ✦ NAME SPOTLIGHT ✦
        </span>
      </div>

      {/* Domain name */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: hs * 1.15,
          fontWeight: 900,
          margin: 0,
          marginBottom: h * 0.025,
          letterSpacing: "-0.02em",
          position: "relative",
          zIndex: 1,
          fontFamily: "Arial Black, Arial, sans-serif",
        }}
      >
        {config.domainName || "CloudSync.io"}
      </h1>

      <GoldRule w="55%" style={{ marginBottom: h * 0.03 }} />

      {/* Score badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: bs * 0.8,
          background: "rgba(255,255,255,0.04)",
          border: `1.5px solid ${config.accentColor}45`,
          borderRadius: bs * 0.9,
          padding: `${bs * 0.7}px ${bs * 1.6}px`,
          marginBottom: h * 0.04,
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: config.accentColor,
            fontSize: hs * 1.3,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "Arial Black, Arial, sans-serif",
          }}
        >
          {config.score}
        </span>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: bs * 0.65,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            / 100
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: bs * 0.85,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {config.scoreLabel}
          </div>
        </div>
      </div>

      {/* Traits */}
      <div
        style={{
          textAlign: "left",
          width: "100%",
          maxWidth: w * 0.6,
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.traits.slice(0, Math.min(5, Math.floor((h * 0.25) / (bs * 1.6)))).map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: bs * 0.55,
              marginBottom: bs * 0.45,
            }}
          >
            <span style={{ color: config.accentColor, fontSize: bs, fontWeight: 700 }}>✓</span>
            <span style={{ color: "rgba(255,255,255,0.72)", fontSize: bs * 0.88 }}>{t}</span>
          </div>
        ))}
      </div>

      <GoldRule style={{ width: "100%", marginTop: h * 0.025, marginBottom: h * 0.02 }} />
      <p
        style={{
          color: config.accentColor,
          fontSize: bs,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "0.07em",
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.ctaText}{" "}
        <span style={{ color: "rgba(255,255,255,0.8)" }}>{config.ctaUrl}</span>
      </p>
    </div>
  )
}

// ─── Template C — Comparison ──────────────────────────────────────────────────
function TemplateC({ config, w, h }: TemplateProps) {
  const hs = Math.round(w * (config.headlineFontSize / 520) * 0.72)
  const bs = Math.round(w * (config.bodyFontSize / 520) * 0.88)
  const pad = Math.round(w * 0.048)

  // How many rows fit — compute available space
  const headlineH = hs * 1.3 + pad * 0.8
  const colHeaderH = bs * 2.6 + pad * 0.6
  const ctaH = bs * 2.2 + pad * 0.8
  const ruleH = 2 + pad * 0.8
  const availRows = h - pad * 2 - headlineH - colHeaderH - ctaH - ruleH * 2
  const rowItemH = bs * 2.2 + 5
  const maxRows = Math.max(2, Math.floor(availRows / rowItemH))
  const rowCount = Math.min(maxRows, config.ourFeatures.length, config.theirFeatures.length)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${pad}px`,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Glow top right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "55%",
          height: "50%",
          background:
            "radial-gradient(ellipse at 85% 8%, rgba(212,175,55,0.18) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      {/* Gold top accent line */}
      <GoldRule style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%" }} />

      {/* Header row: NamoLux logo + headline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: pad * 0.6,
          position: "relative",
          zIndex: 1,
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: hs,
            fontWeight: 900,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            margin: 0,
            flex: 1,
            fontFamily: "Arial Black, Arial, sans-serif",
            lineHeight: 1.15,
          }}
        >
          {config.headline}
        </h1>
        <NamoLogo size={bs * 0.85} accent={config.accentColor} />
      </div>

      <GoldRule style={{ marginBottom: pad * 0.7 }} />

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: pad * 0.6,
          marginBottom: pad * 0.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* NamoLux */}
        <div
          style={{
            background: `${config.accentColor}1A`,
            border: `1.5px solid ${config.accentColor}40`,
            borderRadius: bs * 0.7,
            padding: `${bs * 0.5}px ${bs * 0.9}px`,
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: config.accentColor,
              fontSize: bs * 1.05,
              fontWeight: 800,
              letterSpacing: "0.03em",
              fontFamily: "Arial Black, Arial, sans-serif",
            }}
          >
            NamoLux ✦
          </span>
        </div>
        {/* Competitor */}
        <div
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: bs * 0.7,
            padding: `${bs * 0.5}px ${bs * 0.9}px`,
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: bs * 1.05,
              fontWeight: 700,
            }}
          >
            {config.competitor || "Namelix"}
          </span>
        </div>
      </div>

      {/* Feature rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(pad * 0.28),
          flex: 1,
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: pad * 0.6,
            }}
          >
            {/* Our feature */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: bs * 0.5,
                background: "rgba(212,175,55,0.05)",
                border: "1px solid rgba(212,175,55,0.12)",
                borderRadius: bs * 0.5,
                padding: `${bs * 0.45}px ${bs * 0.65}px`,
              }}
            >
              <span
                style={{
                  color: config.accentColor,
                  fontSize: bs,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: bs * 0.82,
                  lineHeight: 1.3,
                }}
              >
                {config.ourFeatures[i] || ""}
              </span>
            </div>
            {/* Their feature */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: bs * 0.5,
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: bs * 0.5,
                padding: `${bs * 0.45}px ${bs * 0.65}px`,
              }}
            >
              <span
                style={{
                  color: "#ef4444",
                  fontSize: bs,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✗
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.28)",
                  fontSize: bs * 0.82,
                  lineHeight: 1.3,
                  textDecoration: "line-through",
                }}
              >
                {config.theirFeatures[i] || ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <GoldRule style={{ marginTop: pad * 0.5, marginBottom: pad * 0.4 }} />
      <div
        style={{ display: "flex", alignItems: "center", gap: bs * 0.5, position: "relative", zIndex: 1 }}
      >
        <span
          style={{
            color: config.accentColor,
            fontSize: bs * 0.95,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {config.ctaText}
        </span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: bs * 0.95, fontWeight: 500 }}>
          {config.ctaUrl}
        </span>
      </div>
    </div>
  )
}

// ─── Template D — Stat / Quote ────────────────────────────────────────────────
function TemplateD({ config, w, h }: TemplateProps) {
  const hs = Math.round(w * (config.headlineFontSize / 520))
  const bs = Math.round(w * (config.bodyFontSize / 520))
  const pad = Math.round(w * 0.08)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${pad}px`,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      {/* Corner glow layers */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${config.accentColor}14 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <GoldRule style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%" }} />
      <GoldRule style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%" }} />

      {/* Quote glyph */}
      <div
        style={{
          color: `${config.accentColor}30`,
          fontSize: hs * 2.4,
          lineHeight: 0.7,
          fontWeight: 900,
          marginBottom: h * 0.02,
          fontFamily: "Georgia, serif",
          position: "relative",
          zIndex: 1,
        }}
      >
        "
      </div>

      {/* Big number / stat */}
      <h1
        style={{
          color: config.accentColor,
          fontSize: hs * 2,
          fontWeight: 900,
          margin: 0,
          marginBottom: h * 0.02,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          position: "relative",
          zIndex: 1,
          fontFamily: "Arial Black, Arial, sans-serif",
        }}
      >
        {config.statNumber || config.headline}
      </h1>

      <GoldRule w="45%" style={{ marginBottom: h * 0.025 }} />

      <p
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: bs * 1.15,
          lineHeight: 1.55,
          margin: 0,
          marginBottom: h * 0.05,
          maxWidth: w * 0.7,
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.statLabel || config.subtitle}
      </p>

      {/* Logo footer */}
      <div
        style={{
          position: "absolute",
          bottom: pad * 0.9,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: bs * 0.6,
          zIndex: 1,
        }}
      >
        <NamoLogo size={bs * 0.9} accent={config.accentColor} />
        <span
          style={{
            color: `${config.accentColor}99`,
            fontSize: bs * 0.75,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          {config.ctaUrl}
        </span>
      </div>
    </div>
  )
}

// ─── Template E — Tip / Insight ───────────────────────────────────────────────
function TemplateE({ config, w, h }: TemplateProps) {
  const hs = Math.round(w * (config.headlineFontSize / 520) * 0.82)
  const bs = Math.round(w * (config.bodyFontSize / 520))
  const pad = Math.round(w * 0.052)

  // How many tips fit
  const afterHeader = h - pad * 2 - hs * 1.3 - pad - 2 - pad * 0.6 - bs * 2.4
  const tipH = bs * 2.2 + pad * 0.35
  const maxTips = Math.max(2, Math.floor(afterHeader / tipH))
  const tipCount = Math.min(maxTips, config.tips.length)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${pad}px`,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Gold glow top-left */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "55%",
          height: "45%",
          background: `radial-gradient(ellipse at 15% 10%, ${config.accentColor}1C 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <GoldRule style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%" }} />

      {/* Icon + label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: bs * 0.7,
          marginBottom: pad * 0.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: bs * 2.2,
            height: bs * 2.2,
            borderRadius: bs * 0.5,
            background: `${config.accentColor}1E`,
            border: `1px solid ${config.accentColor}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: bs * 1.1,
            flexShrink: 0,
          }}
        >
          💡
        </div>
        <span
          style={{
            color: config.accentColor,
            fontSize: bs * 0.7,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          FOUNDER TIP
        </span>
        <div style={{ flex: 1 }} />
        <NamoLogo size={bs * 0.75} accent={config.accentColor} />
      </div>

      {/* Headline */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: hs,
          fontWeight: 900,
          lineHeight: 1.15,
          margin: 0,
          marginBottom: pad * 0.55,
          letterSpacing: "-0.015em",
          position: "relative",
          zIndex: 1,
          fontFamily: "Arial Black, Arial, sans-serif",
          whiteSpace: "pre-wrap",
        }}
      >
        {config.headline}
      </h1>

      <GoldRule style={{ marginBottom: pad * 0.55 }} />

      {/* Tips */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: Math.round(pad * 0.35),
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {config.tips.slice(0, tipCount).map((tip, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: bs * 0.75,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: bs * 1.55,
                height: bs * 1.55,
                borderRadius: "50%",
                background: `${config.accentColor}1E`,
                border: `1px solid ${config.accentColor}50`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.accentColor,
                fontSize: bs * 0.72,
                fontWeight: 800,
                marginTop: "1px",
              }}
            >
              {i + 1}
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: bs * 0.92,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {tip}
            </p>
          </div>
        ))}
      </div>

      <GoldRule style={{ marginTop: pad * 0.5, marginBottom: pad * 0.38 }} />
      <div
        style={{ display: "flex", alignItems: "center", gap: bs * 0.5, position: "relative", zIndex: 1 }}
      >
        <span
          style={{
            color: config.accentColor,
            fontSize: bs * 0.92,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {config.ctaText}
        </span>
        <span style={{ color: "rgba(255,255,255,0.68)", fontSize: bs * 0.92 }}>
          {config.ctaUrl}
        </span>
      </div>
    </div>
  )
}

// ─── Main canvas preview component ───────────────────────────────────────────
interface CanvasPreviewProps {
  config: PostConfig
}

export const CanvasPreview = forwardRef<HTMLDivElement, CanvasPreviewProps>(
  function CanvasPreview({ config }, ref) {
    const platform = PLATFORMS[config.platform]
    const previewH = Math.round(PREVIEW_WIDTH * (platform.height / platform.width))
    const props: TemplateProps = { config, w: PREVIEW_WIDTH, h: previewH }

    return (
      <div
        ref={ref}
        style={{
          width: PREVIEW_WIDTH,
          height: previewH,
          position: "relative",
          overflow: "hidden",
          display: "block",
        }}
      >
        {config.template === "A" && <TemplateA {...props} />}
        {config.template === "B" && <TemplateB {...props} />}
        {config.template === "C" && <TemplateC {...props} />}
        {config.template === "D" && <TemplateD {...props} />}
        {config.template === "E" && <TemplateE {...props} />}
      </div>
    )
  },
)
