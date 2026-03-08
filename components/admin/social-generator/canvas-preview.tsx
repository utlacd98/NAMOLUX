"use client"

import { forwardRef } from "react"
import type { PostConfig } from "./types"
import { PLATFORMS, PREVIEW_WIDTH } from "./types"
import { PhoneMockup } from "./phone-mockup"

interface CanvasPreviewProps {
  config: PostConfig
}

// ── shared helpers ────────────────────────────────────────────────────────────
function GoldLine({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: "2px",
        background: "linear-gradient(to right, transparent, #D4AF37 30%, #F6E27A 50%, #D4AF37 70%, transparent)",
        ...style,
      }}
    />
  )
}

function GoldBullet({ text, fontSize, accentColor }: { text: string; fontSize: number; accentColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: `${fontSize * 0.6}px` }}>
      <span style={{ color: accentColor, fontSize: `${fontSize + 2}px`, lineHeight: 1.4, flexShrink: 0 }}>✦</span>
      <span
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: `${fontSize}px`,
          lineHeight: 1.5,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {text}
      </span>
    </div>
  )
}

function CheckRow({
  text,
  check,
  fontSize,
  accentColor,
}: {
  text: string
  check: boolean
  fontSize: number
  accentColor: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: `${fontSize * 0.5}px` }}>
      <span
        style={{
          color: check ? accentColor : "#ef4444",
          fontSize: `${fontSize + 2}px`,
          fontWeight: "bold",
          flexShrink: 0,
          width: "16px",
        }}
      >
        {check ? "✓" : "✗"}
      </span>
      <span
        style={{
          color: check ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          fontSize: `${fontSize}px`,
          textDecoration: check ? "none" : "line-through",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {text}
      </span>
    </div>
  )
}

// ── Template A: Product Showcase ──────────────────────────────────────────────
function TemplateA({ config, scale }: { config: PostConfig; scale: number }) {
  const hs = config.headlineFontSize * scale
  const bs = config.bodyFontSize * scale
  const phoneW = Math.round(130 * scale)
  const phoneH = Math.round(260 * scale)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${28 * scale}px ${32 * scale}px`,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Gold radial glow top-right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "65%",
          height: "55%",
          background:
            "radial-gradient(ellipse at 90% 5%, rgba(212,175,55,0.30) 0%, rgba(212,175,55,0.08) 45%, transparent 70%)",
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
          height: "30%",
          background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Headline */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: `${hs}px`,
          fontWeight: "900",
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          margin: 0,
          marginBottom: `${16 * scale}px`,
          position: "relative",
          zIndex: 1,
          whiteSpace: "pre-wrap",
        }}
      >
        {config.headline}
      </h1>

      {/* Gold divider */}
      <GoldLine style={{ marginBottom: `${20 * scale}px`, position: "relative", zIndex: 1 }} />

      {/* Content row */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: `${24 * scale}px`,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {/* Features list */}
        <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {config.features.map((f, i) => (
            <GoldBullet key={i} text={f} fontSize={bs} accentColor={config.accentColor} />
          ))}
        </div>

        {/* Phone mockups */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            gap: `${(-phoneW * 0.2)}px`,
          }}
        >
          {config.screenshots.length >= 2 ? (
            <>
              <div style={{ transform: "rotate(-4deg) translateY(10px)", zIndex: 1 }}>
                <PhoneMockup screenshot={config.screenshots[0]} width={phoneW} height={phoneH} />
              </div>
              <div style={{ transform: "rotate(3deg) translateY(-6px)", zIndex: 2 }}>
                <PhoneMockup screenshot={config.screenshots[1]} width={phoneW} height={phoneH} />
              </div>
            </>
          ) : config.screenshots.length === 1 ? (
            <>
              <div style={{ transform: "rotate(-4deg) translateY(10px)", zIndex: 1 }}>
                <PhoneMockup screenshot={config.screenshots[0]} width={phoneW} height={phoneH} />
              </div>
              <div style={{ transform: "rotate(3deg) translateY(-6px)", zIndex: 2 }}>
                <PhoneMockup width={phoneW} height={phoneH} />
              </div>
            </>
          ) : (
            <>
              <div style={{ transform: "rotate(-4deg) translateY(10px)", zIndex: 1 }}>
                <PhoneMockup width={phoneW} height={phoneH} />
              </div>
              <div style={{ transform: "rotate(3deg) translateY(-6px)", zIndex: 2 }}>
                <PhoneMockup width={phoneW} height={phoneH} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: "relative", zIndex: 1, marginTop: `${16 * scale}px` }}>
        <GoldLine style={{ marginBottom: `${12 * scale}px` }} />
        <p
          style={{
            color: config.accentColor,
            fontSize: `${bs * 1.1}px`,
            fontWeight: "700",
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {config.ctaText}{" "}
          <span style={{ color: "rgba(255,255,255,0.9)" }}>{config.ctaUrl}</span>
        </p>
      </div>
    </div>
  )
}

// ── Template B: Name Spotlight ────────────────────────────────────────────────
function TemplateB({ config, scale }: { config: PostConfig; scale: number }) {
  const hs = config.headlineFontSize * scale
  const bs = config.bodyFontSize * scale

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${36 * scale}px ${40 * scale}px`,
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Label */}
      <p
        style={{
          color: config.accentColor,
          fontSize: `${bs * 0.8}px`,
          fontWeight: "700",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
          marginBottom: `${12 * scale}px`,
        }}
      >
        ✦ NAME SPOTLIGHT ✦
      </p>

      {/* Domain name */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: `${hs * 1.2}px`,
          fontWeight: "900",
          margin: 0,
          marginBottom: `${8 * scale}px`,
          letterSpacing: "-0.02em",
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.domainName || "CloudSync.io"}
      </h1>

      <GoldLine style={{ width: "60%", marginBottom: `${16 * scale}px` }} />

      {/* Score badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: `${8 * scale}px`,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${config.accentColor}55`,
          borderRadius: `${12 * scale}px`,
          padding: `${10 * scale}px ${24 * scale}px`,
          marginBottom: `${24 * scale}px`,
        }}
      >
        <span
          style={{
            color: config.accentColor,
            fontSize: `${hs}px`,
            fontWeight: "900",
            lineHeight: 1,
          }}
        >
          {config.score}
        </span>
        <div style={{ textAlign: "left" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: `${bs * 0.7}px`,
              margin: 0,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            / 100
          </p>
          <p
            style={{
              color: "#ffffff",
              fontSize: `${bs * 0.9}px`,
              fontWeight: "700",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            {config.scoreLabel}
          </p>
        </div>
      </div>

      {/* Traits */}
      <div style={{ textAlign: "left", width: "100%", maxWidth: `${280 * scale}px` }}>
        {config.traits.slice(0, 5).map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: `${8 * scale}px`,
              marginBottom: `${6 * scale}px`,
            }}
          >
            <span style={{ color: config.accentColor, fontSize: `${bs}px` }}>✓</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: `${bs * 0.9}px` }}>{t}</span>
          </div>
        ))}
      </div>

      <GoldLine style={{ width: "100%", marginTop: `${20 * scale}px`, marginBottom: `${12 * scale}px` }} />

      <p
        style={{
          color: config.accentColor,
          fontSize: `${bs}px`,
          fontWeight: "700",
          margin: 0,
          letterSpacing: "0.08em",
        }}
      >
        {config.ctaText} {config.ctaUrl}
      </p>
    </div>
  )
}

// ── Template C: Comparison ────────────────────────────────────────────────────
function TemplateC({ config, scale }: { config: PostConfig; scale: number }) {
  const hs = config.headlineFontSize * scale * 0.75
  const bs = config.bodyFontSize * scale * 0.9

  const maxRows = Math.max(config.ourFeatures.length, config.theirFeatures.length)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${24 * scale}px ${32 * scale}px`,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "45%",
          background:
            "radial-gradient(ellipse at 80% 10%, rgba(212,175,55,0.18) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Headline */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: `${hs}px`,
          fontWeight: "900",
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          margin: 0,
          marginBottom: `${14 * scale}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.headline}
      </h1>

      <GoldLine style={{ marginBottom: `${16 * scale}px` }} />

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: `${16 * scale}px`,
          marginBottom: `${12 * scale}px`,
        }}
      >
        <div
          style={{
            background: `${config.accentColor}18`,
            border: `1px solid ${config.accentColor}40`,
            borderRadius: `${8 * scale}px`,
            padding: `${8 * scale}px ${14 * scale}px`,
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: config.accentColor,
              fontSize: `${bs * 1.1}px`,
              fontWeight: "800",
              letterSpacing: "0.05em",
            }}
          >
            NamoLux ✦
          </span>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: `${8 * scale}px`,
            padding: `${8 * scale}px ${14 * scale}px`,
            textAlign: "center",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: `${bs * 1.1}px`, fontWeight: "700" }}>
            {config.competitor || "Namelix"}
          </span>
        </div>
      </div>

      {/* Feature rows */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: `${6 * scale}px` }}>
        {Array.from({ length: maxRows }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: `${16 * scale}px`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: `${8 * scale}px`,
                background: "rgba(212,175,55,0.04)",
                border: "1px solid rgba(212,175,55,0.1)",
                borderRadius: `${6 * scale}px`,
                padding: `${6 * scale}px ${10 * scale}px`,
              }}
            >
              <span style={{ color: config.accentColor, fontSize: `${bs}px`, fontWeight: "bold" }}>✓</span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: `${bs * 0.85}px` }}>
                {config.ourFeatures[i] || ""}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: `${8 * scale}px`,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: `${6 * scale}px`,
                padding: `${6 * scale}px ${10 * scale}px`,
              }}
            >
              <span style={{ color: "#ef4444", fontSize: `${bs}px`, fontWeight: "bold" }}>✗</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: `${bs * 0.85}px`,
                  textDecoration: "line-through",
                }}
              >
                {config.theirFeatures[i] || ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <GoldLine style={{ marginTop: `${14 * scale}px`, marginBottom: `${10 * scale}px` }} />
      <p
        style={{
          color: config.accentColor,
          fontSize: `${bs}px`,
          fontWeight: "700",
          margin: 0,
          letterSpacing: "0.05em",
        }}
      >
        {config.ctaText} <span style={{ color: "rgba(255,255,255,0.8)" }}>{config.ctaUrl}</span>
      </p>
    </div>
  )
}

// ── Template D: Stat/Quote ────────────────────────────────────────────────────
function TemplateD({ config, scale }: { config: PostConfig; scale: number }) {
  const hs = config.headlineFontSize * scale
  const bs = config.bodyFontSize * scale

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${40 * scale}px ${44 * scale}px`,
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      {/* Multiple glow layers */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          height: "80%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}15 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Quote mark or icon */}
      <div
        style={{
          color: `${config.accentColor}40`,
          fontSize: `${hs * 2}px`,
          lineHeight: 0.8,
          fontWeight: "900",
          marginBottom: `${16 * scale}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        "
      </div>

      {/* Stat or quote */}
      <h1
        style={{
          color: config.accentColor,
          fontSize: `${hs * 1.8}px`,
          fontWeight: "900",
          margin: 0,
          marginBottom: `${12 * scale}px`,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.statNumber || config.headline}
      </h1>

      <GoldLine style={{ width: "50%", marginBottom: `${16 * scale}px` }} />

      <p
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: `${bs * 1.1}px`,
          lineHeight: 1.5,
          margin: 0,
          marginBottom: `${32 * scale}px`,
          maxWidth: `${320 * scale}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {config.statLabel || config.subtitle}
      </p>

      {/* Logo + URL */}
      <div
        style={{
          position: "absolute",
          bottom: `${28 * scale}px`,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: `${6 * scale}px`,
        }}
      >
        <GoldLine style={{ width: `${120 * scale}px` }} />
        <div style={{ display: "flex", alignItems: "center", gap: `${8 * scale}px` }}>
          <div
            style={{
              width: `${20 * scale}px`,
              height: `${20 * scale}px`,
              borderRadius: `${4 * scale}px`,
              background: `linear-gradient(135deg, ${config.accentColor}, #F6E27A)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${bs * 0.75}px`,
              fontWeight: "900",
              color: "#000",
            }}
          >
            N
          </div>
          <span style={{ color: config.accentColor, fontSize: `${bs * 0.9}px`, fontWeight: "700" }}>
            {config.ctaUrl}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Template E: Tip/Insight ───────────────────────────────────────────────────
function TemplateE({ config, scale }: { config: PostConfig; scale: number }) {
  const hs = config.headlineFontSize * scale * 0.85
  const bs = config.bodyFontSize * scale

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.bgColor,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: `${28 * scale}px ${36 * scale}px`,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%",
          height: "50%",
          background: `radial-gradient(ellipse at 20% 10%, ${config.accentColor}18 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Icon + label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: `${10 * scale}px`,
          marginBottom: `${16 * scale}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: `${36 * scale}px`,
            height: `${36 * scale}px`,
            borderRadius: `${8 * scale}px`,
            background: `${config.accentColor}22`,
            border: `1px solid ${config.accentColor}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${bs * 1.1}px`,
            flexShrink: 0,
          }}
        >
          💡
        </div>
        <span
          style={{
            color: config.accentColor,
            fontSize: `${bs * 0.75}px`,
            fontWeight: "700",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          FOUNDER TIP
        </span>
      </div>

      {/* Headline */}
      <h1
        style={{
          color: "#ffffff",
          fontSize: `${hs}px`,
          fontWeight: "900",
          lineHeight: 1.15,
          margin: 0,
          marginBottom: `${14 * scale}px`,
          letterSpacing: "-0.01em",
          position: "relative",
          zIndex: 1,
          whiteSpace: "pre-wrap",
        }}
      >
        {config.headline}
      </h1>

      <GoldLine style={{ marginBottom: `${18 * scale}px` }} />

      {/* Tips */}
      <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
        {config.tips.map((tip, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: `${12 * scale}px`,
              marginBottom: `${10 * scale}px`,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: `${22 * scale}px`,
                height: `${22 * scale}px`,
                borderRadius: "50%",
                background: `${config.accentColor}22`,
                border: `1px solid ${config.accentColor}55`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.accentColor,
                fontSize: `${bs * 0.75}px`,
                fontWeight: "800",
                marginTop: "1px",
              }}
            >
              {i + 1}
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: `${bs * 0.95}px`,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {tip}
            </p>
          </div>
        ))}
      </div>

      <GoldLine style={{ marginTop: `${12 * scale}px`, marginBottom: `${10 * scale}px` }} />
      <p
        style={{
          color: config.accentColor,
          fontSize: `${bs}px`,
          fontWeight: "700",
          margin: 0,
          letterSpacing: "0.05em",
        }}
      >
        {config.ctaText} <span style={{ color: "rgba(255,255,255,0.8)" }}>{config.ctaUrl}</span>
      </p>
    </div>
  )
}

// ── Main canvas preview ───────────────────────────────────────────────────────
export const CanvasPreview = forwardRef<HTMLDivElement, CanvasPreviewProps>(function CanvasPreview(
  { config },
  ref,
) {
  const platform = PLATFORMS[config.platform]
  const previewHeight = Math.round(PREVIEW_WIDTH * (platform.height / platform.width))
  const scale = PREVIEW_WIDTH / 600 // base scale (templates designed at 600px width)

  const templateProps = { config, scale }

  return (
    <div
      ref={ref}
      style={{
        width: `${PREVIEW_WIDTH}px`,
        height: `${previewHeight}px`,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {config.template === "A" && <TemplateA {...templateProps} />}
      {config.template === "B" && <TemplateB {...templateProps} />}
      {config.template === "C" && <TemplateC {...templateProps} />}
      {config.template === "D" && <TemplateD {...templateProps} />}
      {config.template === "E" && <TemplateE {...templateProps} />}
    </div>
  )
})
