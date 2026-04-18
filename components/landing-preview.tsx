"use client"

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react"
import { Monitor, Smartphone, Download, Loader2 } from "lucide-react"

interface PaletteColour { hex: string }
interface Palette {
  primary: PaletteColour
  secondary: PaletteColour
  accent: PaletteColour
  background: PaletteColour
  text: PaletteColour
}
export interface LandingPreviewProps {
  brandName: string
  keywords: string
  vibe: string
  palette: Palette
}
type Device = "mobile" | "desktop"

const MOBILE_W  = 390
const MOBILE_H  = 820
const DESKTOP_W = 1280
const DESKTOP_H = 740

function safeHex(c: PaletteColour) {
  return /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : "#888888"
}
function contrastText(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#000000" : "#ffffff"
}

const VIBE_COPY: Record<string, {
  badge: string
  h1: string; h2: string
  sub: string
  cta: string; ctaSec: string
  features: { title: string; desc: string }[]
  band: string
}> = {
  luxury: {
    badge: "New Collection",
    h1: "Elevate your everyday.", h2: "Live beautifully.",
    sub: "Where sophistication meets effortless living.",
    cta: "Explore Collection", ctaSec: "Our Story",
    features: [
      { title: "Crafted with Intent",  desc: "Every detail considered. Nothing left to chance." },
      { title: "Built to Last",        desc: "Quality that endures beyond seasons and trends." },
      { title: "Yours, Exclusively",   desc: "An experience designed around you alone." },
    ],
    band: "Begin your journey with us.",
  },
  futuristic: {
    badge: "Now in Beta",
    h1: "The future is", h2: "already here.",
    sub: "Engineered for what comes next — powered by AI.",
    cta: "Get Early Access", ctaSec: "See how it works",
    features: [
      { title: "AI-Powered Core",   desc: "Intelligent systems that learn and adapt to you." },
      { title: "Blazing Fast",      desc: "Performance optimised at every layer of the stack." },
      { title: "Scales Instantly",  desc: "From zero to enterprise without slowing down." },
    ],
    band: "Ready to build the future?",
  },
  playful: {
    badge: "Say hello 👋",
    h1: "Where happiness", h2: "finds its home.",
    sub: "Life's too short for boring tools. Let's fix that.",
    cta: "Join the Fun", ctaSec: "Learn more",
    features: [
      { title: "Delightfully Easy", desc: "Simple for anyone. Powerful for everyone." },
      { title: "Always Fresh",      desc: "New surprises waiting around every corner." },
      { title: "Made for You",      desc: "Personalised experiences that feel just right." },
    ],
    band: "Your next favourite thing is waiting.",
  },
  trustworthy: {
    badge: "Trusted & Secure",
    h1: "The platform", h2: "you can count on.",
    sub: "Built on transparency, security, and reliability.",
    cta: "Start for Free", ctaSec: "View security",
    features: [
      { title: "Bank-Grade Security", desc: "Enterprise encryption protecting every account." },
      { title: "99.9% Uptime",        desc: "Always available when your business needs it." },
      { title: "24/7 Support",        desc: "Real humans ready to help, around the clock." },
    ],
    band: "Trusted by thousands worldwide.",
  },
  minimal: {
    badge: "Simple & Focused",
    h1: "Everything you need.", h2: "Nothing you don't.",
    sub: "Clean, fast, and built for clarity.",
    cta: "Get Started", ctaSec: "See pricing",
    features: [
      { title: "Zero Clutter",   desc: "A focused interface that gets out of your way." },
      { title: "Instant Setup",  desc: "From sign-up to productive in 60 seconds." },
      { title: "Works Anywhere", desc: "Seamless across every device you own." },
    ],
    band: "Less noise. More results.",
  },
}

// ── Product UI card — goes in the hero ────────────────────────────────────────
function ProductCard({
  p, mob, isLux, brandName,
}: {
  p: { primary: string; secondary: string; accent: string; bg: string; text: string }
  mob: boolean; isLux: boolean; brandName: string
}) {
  const cardW = mob ? 236 : 300
  const onPrimary = contrastText(p.primary)

  // Mini sparkline path points
  const pts = [0,38,22,20,44,32,66,10,88,24,110,8,132,18].reduce<string>((s, v, i) =>
    i % 2 === 0 ? s + `${(v / 132) * (cardW - 32)},` : s + `${v} ` , "")

  return (
    <div style={{
      width: cardW,
      borderRadius: isLux ? 4 : 20,
      overflow: "hidden",
      boxShadow: `0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px ${p.text}10`,
      background: p.bg,
      flexShrink: 0,
    }}>
      {/* Card header bar */}
      <div style={{
        background: p.primary,
        padding: mob ? "10px 14px" : "14px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: mob ? 20 : 26, height: mob ? 20 : 26,
            borderRadius: isLux ? 3 : 7,
            background: `${onPrimary}22`,
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{
            fontSize: mob ? 10 : 12, fontWeight: 700,
            color: onPrimary,
            fontFamily: isLux ? "Georgia, serif" : "system-ui, sans-serif",
            letterSpacing: isLux ? "0.08em" : 0,
          }}>
            {brandName || "Dashboard"}
          </span>
        </div>
        {/* Live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 6px #4ade8088",
          }} />
          <span style={{ fontSize: 9, color: `${onPrimary}80`, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Stat row */}
      <div style={{
        padding: mob ? "12px 14px 8px" : "16px 18px 10px",
        display: "flex", gap: mob ? 12 : 18,
        borderBottom: `1px solid ${p.text}08`,
      }}>
        {[
          { label: "Users", val: "2,847" },
          { label: "Revenue", val: "$18.4k" },
          { label: "Growth", val: "+34%" },
        ].map(s => (
          <div key={s.label}>
            <div style={{
              fontSize: mob ? 14 : 18, fontWeight: 800,
              color: p.text, lineHeight: 1,
              fontFamily: "system-ui, sans-serif",
            }}>{s.val}</div>
            <div style={{
              fontSize: mob ? 8 : 9, color: `${p.text}45`,
              marginTop: 2, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sparkline chart */}
      <div style={{ padding: mob ? "10px 14px" : "14px 18px" }}>
        <div style={{
          fontSize: mob ? 8 : 9, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: `${p.text}35`, marginBottom: 8,
        }}>
          Last 7 days
        </div>
        <svg
          width={cardW - 32}
          height={mob ? 32 : 46}
          style={{ display: "block" }}
        >
          {/* Fill */}
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.primary} stopOpacity="0.25" />
              <stop offset="100%" stopColor={p.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={pts}
            fill="none"
            stroke={p.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Highlight dot at end */}
          {(() => {
            const allPts = pts.trim().split(" ")
            const last = allPts[allPts.length - 1]?.split(",")
            if (!last || last.length < 2) return null
            return (
              <circle cx={last[0]} cy={last[1]} r="3.5" fill={p.accent} />
            )
          })()}
        </svg>
      </div>

      {/* Status chips */}
      <div style={{
        padding: mob ? "0 14px 12px" : "0 18px 16px",
        display: "flex", gap: 6,
      }}>
        {[
          { label: "On track", color: "#4ade80" },
          { label: p.accent, color: p.accent, isColor: true },
        ].map((chip, i) => (
          <span key={i} style={{
            fontSize: mob ? 8 : 9,
            fontWeight: 700,
            color: i === 0 ? "#4ade80" : contrastText(chip.color),
            background: i === 0 ? "#4ade8018" : `${p.accent}20`,
            border: `1px solid ${i === 0 ? "#4ade8030" : `${p.accent}35`}`,
            borderRadius: 999,
            padding: "3px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {i === 0 ? "On track" : "Active"}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Full mock landing page ────────────────────────────────────────────────────
function MockPage({ brandName, vibe, palette, device }: {
  brandName: string; vibe: string; palette: Palette; device: Device
}) {
  const p = {
    primary:   safeHex(palette.primary),
    secondary: safeHex(palette.secondary),
    accent:    safeHex(palette.accent),
    bg:        safeHex(palette.background),
    text:      safeHex(palette.text),
  }
  const copy     = VIBE_COPY[vibe] ?? VIBE_COPY.minimal
  const mob      = device === "mobile"
  const isLux    = vibe === "luxury"
  const onPrimary = contrastText(p.primary)
  const headFont = isLux
    ? "Georgia, 'Times New Roman', serif"
    : "'Inter', system-ui, -apple-system, sans-serif"
  const W = mob ? MOBILE_W : DESKTOP_W

  return (
    <div style={{
      width: W,
      minHeight: mob ? MOBILE_H : DESKTOP_H,
      background: p.bg,
      color: p.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: mob ? "14px 22px" : "16px 64px",
        borderBottom: `1px solid ${p.text}0e`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 28, height: 28,
            borderRadius: isLux ? 3 : 8,
            background: p.primary,
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{
            fontFamily: headFont,
            fontWeight: isLux ? 400 : 700,
            fontSize: mob ? 13 : 15,
            letterSpacing: isLux ? "0.12em" : 0,
            textTransform: isLux ? "uppercase" : "none",
            color: p.text,
          }}>
            {brandName || "Brand"}
          </span>
        </div>

        {!mob && (
          <div style={{ display: "flex", gap: 32 }}>
            {["Features", "Pricing", "About"].map(item => (
              <span key={item} style={{
                fontSize: 13, color: `${p.text}60`, fontWeight: 500,
              }}>{item}</span>
            ))}
          </div>
        )}

        <button style={{
          background: p.primary, color: onPrimary,
          border: "none",
          borderRadius: isLux ? 2 : 8,
          padding: mob ? "7px 16px" : "9px 22px",
          fontSize: mob ? 11 : 13,
          fontWeight: 700, cursor: "pointer",
          letterSpacing: isLux ? "0.07em" : 0,
          fontFamily: headFont,
        }}>
          {mob ? "Start" : copy.cta}
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: mob ? "34px 22px 28px" : "72px 64px 64px",
        display: "flex",
        alignItems: mob ? "stretch" : "center",
        gap: mob ? 0 : 56,
        flexDirection: mob ? "column" : "row",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background gradient blob */}
        <div style={{
          position: "absolute",
          top: mob ? -40 : -80,
          right: mob ? -60 : -80,
          width: mob ? 260 : 520,
          height: mob ? 260 : 520,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${p.primary}1a 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />
        {isLux && (
          <div style={{
            position: "absolute", top: 0,
            left: mob ? 22 : 64, right: mob ? 22 : 64, height: 1,
            background: `linear-gradient(90deg, transparent, ${p.accent}55, transparent)`,
          }} />
        )}

        {/* Text */}
        <div style={{ flex: 1, position: "relative", zIndex: 1, minWidth: 0 }}>
          {/* Badge pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${p.accent}1a`,
            border: `1px solid ${p.accent}38`,
            borderRadius: 999,
            padding: "4px 12px",
            marginBottom: mob ? 18 : 24,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: p.accent, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: p.accent, whiteSpace: "nowrap",
            }}>
              {copy.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: headFont,
            fontSize: mob ? 30 : 52,
            fontWeight: isLux ? 400 : 800,
            lineHeight: 1.08,
            color: p.text,
            margin: "0 0 16px",
            letterSpacing: isLux ? "-0.01em" : "-0.03em",
            fontStyle: isLux ? "italic" : "normal",
          }}>
            {copy.h1}<br />{copy.h2}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: mob ? 13 : 17,
            lineHeight: 1.65,
            color: `${p.text}68`,
            margin: "0 0 30px",
            maxWidth: mob ? "100%" : 420,
          }}>
            {copy.sub}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{
              background: p.primary, color: onPrimary,
              border: "none",
              borderRadius: isLux ? 2 : 10,
              padding: mob ? "12px 22px" : "14px 30px",
              fontSize: mob ? 12 : 15,
              fontWeight: 700, cursor: "pointer",
              letterSpacing: isLux ? "0.09em" : 0,
              textTransform: isLux ? "uppercase" : "none",
              fontFamily: headFont,
              boxShadow: `0 6px 22px ${p.primary}38`,
              whiteSpace: "nowrap",
            }}>
              {copy.cta}
            </button>
            {!isLux && (
              <button style={{
                background: "transparent", color: p.text,
                border: `1.5px solid ${p.text}1a`,
                borderRadius: 10,
                padding: mob ? "12px 18px" : "14px 22px",
                fontSize: mob ? 12 : 15,
                fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                {copy.ctaSec}
              </button>
            )}
          </div>

          {/* Trust chips — trustworthy vibe desktop */}
          {vibe === "trustworthy" && !mob && (
            <div style={{ display: "flex", gap: 20, marginTop: 26 }}>
              {["256-bit TLS", "SOC 2 Type II", "GDPR Ready"].map(item => (
                <div key={item} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 12, color: `${p.text}55` }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product UI card */}
        <div style={{
          position: "relative",
          zIndex: 1,
          marginTop: mob ? 28 : 0,
          width: mob ? "100%" : undefined,
          display: mob ? "flex" : undefined,
          justifyContent: mob ? "center" : undefined,
          flexShrink: 0,
        }}>
          {/* Glow behind card */}
          <div style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p.primary}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
          <ProductCard p={p} mob={mob} isLux={isLux} brandName={brandName} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: mob ? "32px 22px" : "56px 64px",
        background: `${p.primary}07`,
        borderTop: `1px solid ${p.text}08`,
        borderBottom: `1px solid ${p.text}08`,
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.12em",
          color: `${p.text}38`,
          marginBottom: mob ? 22 : 36,
          textAlign: "center",
        }}>
          Why {brandName || "us"}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr",
          gap: mob ? 12 : 18,
        }}>
          {copy.features.map((f, i) => (
            <div key={i} style={{
              background: p.bg,
              border: `1px solid ${p.text}0d`,
              borderRadius: isLux ? 2 : 16,
              padding: mob ? "18px 16px" : "24px 20px",
              borderTop: isLux ? `2px solid ${p.primary}` : "none",
            }}>
              {/* Icon dot */}
              <div style={{
                width: 36, height: 36,
                borderRadius: isLux ? 2 : 10,
                background: `${p.primary}1a`,
                border: `1px solid ${p.primary}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: p.primary,
                }} />
              </div>
              <h3 style={{
                fontFamily: headFont,
                fontSize: mob ? 13 : 15,
                fontWeight: isLux ? 400 : 700,
                color: p.text,
                margin: "0 0 6px",
                fontStyle: isLux ? "italic" : "normal",
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: 12, lineHeight: 1.6,
                color: `${p.text}55`, margin: 0,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section style={{
        padding: mob ? "44px 22px" : "72px 64px",
        textAlign: "center",
        background: isLux
          ? p.bg
          : `linear-gradient(135deg, ${p.primary}10, ${p.accent}09)`,
        position: "relative",
        overflow: "hidden",
      }}>
        {!isLux && (
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: mob ? 300 : 600, height: mob ? 300 : 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p.primary}10 0%, transparent 65%)`,
            pointerEvents: "none",
          }} />
        )}
        <h2 style={{
          fontFamily: headFont,
          fontSize: mob ? 22 : 38,
          fontWeight: isLux ? 400 : 800,
          color: p.text,
          margin: "0 0 14px",
          fontStyle: isLux ? "italic" : "normal",
          letterSpacing: isLux ? "0.02em" : "-0.02em",
          position: "relative",
        }}>
          {copy.band}
        </h2>
        <p style={{
          fontSize: mob ? 12 : 16,
          color: `${p.text}55`,
          marginBottom: 30,
          position: "relative",
        }}>
          {isLux ? "Discover the art of refined living." : "Join thousands already making the switch."}
        </p>
        <button style={{
          background: p.primary, color: onPrimary,
          border: "none",
          borderRadius: isLux ? 2 : 12,
          padding: mob ? "13px 32px" : "16px 44px",
          fontSize: mob ? 13 : 16,
          fontWeight: 700, cursor: "pointer",
          letterSpacing: isLux ? "0.1em" : 0,
          textTransform: isLux ? "uppercase" : "none",
          fontFamily: headFont,
          boxShadow: `0 10px 32px ${p.primary}40`,
          position: "relative",
        }}>
          {copy.cta}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: mob ? "16px 22px" : "22px 64px",
        borderTop: `1px solid ${p.text}0a`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap", gap: 6,
      }}>
        <span style={{
          fontFamily: headFont,
          fontSize: 12, fontWeight: isLux ? 400 : 600,
          letterSpacing: isLux ? "0.1em" : 0,
          textTransform: isLux ? "uppercase" : "none",
          color: `${p.text}45`,
        }}>
          {brandName || "Brand"}
        </span>
        <span style={{ fontSize: 10, color: `${p.text}28` }}>
          © {new Date().getFullYear()} {brandName}. All rights reserved.
        </span>
      </footer>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function LandingPreview({ brandName, keywords, vibe, palette }: LandingPreviewProps) {
  const [device, setDevice]           = useState<Device>("mobile")
  const [downloading, setDownloading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mockRef    = useRef<HTMLDivElement>(null)
  const [wrapperWidth, setWrapperWidth] = useState(0)

  useLayoutEffect(() => {
    if (!wrapperRef.current) return
    // Read initial width synchronously before first paint to avoid overflow flash
    setWrapperWidth(wrapperRef.current.clientWidth)
    const ro = new ResizeObserver(e => setWrapperWidth(e[0].contentRect.width))
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Dynamic mobile display width — fits inside the container with p-4 (32px) + 12px phone border
  const useCompactMobilePreview = wrapperWidth > 0 && wrapperWidth < 430
  const MOB_DISPLAY_W = wrapperWidth > 0
    ? useCompactMobilePreview
      ? Math.max(272, Math.min(308, wrapperWidth - 28))
      : Math.min(320, wrapperWidth - 32 - 12)
    : 320
  const MOBILE_PREVIEW_VIEWPORT_H = useCompactMobilePreview ? 620 : MOBILE_H
  const mobScale  = MOB_DISPLAY_W / MOBILE_W
  const deskScale = wrapperWidth > 0 ? (wrapperWidth - 32) / DESKTOP_W : 1
  const scale     = device === "mobile" ? mobScale : deskScale
  const W         = device === "mobile" ? MOBILE_W : DESKTOP_W
  const H         = device === "mobile" ? MOBILE_H : DESKTOP_H
  const displayH  = H * scale

  const download = useCallback(async () => {
    if (!mockRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(mockRef.current, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: safeHex(palette.background),
        width: W, height: H, windowWidth: W, windowHeight: H,
      })
      const link = document.createElement("a")
      link.download = `${(brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-${device}-mockup.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch { /* non-critical */ } finally {
      setDownloading(false)
    }
  }, [brandName, device, palette.background, W, H])

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}
          >
            <Monitor className="h-4 w-4" style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Landing Page Preview</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Live mockup · your brand colours applied
            </p>
          </div>
        </div>
        <div
          className="flex rounded-xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {(["mobile", "desktop"] as Device[]).map(d => {
            const Icon = d === "mobile" ? Smartphone : Monitor
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition-all"
                style={device === d
                  ? { background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.28)" }
                  : { color: "rgba(255,255,255,0.32)", border: "1px solid transparent" }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview area */}
      <div className="p-4">
        {device === "desktop" ? (
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "rgba(18,18,22,0.97)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57","#ffbc2e","#28c840"].map(c => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
              </div>
              <div
                className="mx-auto flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.38)",
                  minWidth: 140, maxWidth: 240,
                }}
              >
                🔒 {(brandName || "brand").toLowerCase().replace(/\s+/g, "")}.com
              </div>
            </div>
            <div style={{ overflow: "hidden", height: displayH, position: "relative" }}>
              <div
                ref={mockRef}
                style={{
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                  width: W,
                  position: "absolute", top: 0, left: 0,
                }}
              >
                <MockPage brandName={brandName} vibe={vibe} palette={palette} device={device} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            {useCompactMobilePreview ? (
              <div
                style={{
                  border: "4px solid rgba(255,255,255,0.1)",
                  borderRadius: 34,
                  overflow: "hidden",
                  background: "#000",
                  boxShadow: "0 22px 54px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 7, left: "50%",
                  transform: "translateX(-50%)",
                  width: 72, height: 20,
                  background: "#000",
                  borderRadius: 12,
                  zIndex: 20,
                  pointerEvents: "none",
                }} />
                <div style={{
                  overflow: "hidden",
                  width: MOB_DISPLAY_W,
                  height: MOBILE_PREVIEW_VIEWPORT_H * mobScale,
                  position: "relative",
                }}>
                  <div
                    ref={mockRef}
                    style={{
                      transformOrigin: "top left",
                      transform: `scale(${mobScale})`,
                      width: MOBILE_W,
                      position: "absolute", top: 0, left: 0,
                    }}
                  >
                    <div style={{ height: 34, background: safeHex(palette.background) }} />
                    <MockPage brandName={brandName} vibe={vibe} palette={palette} device={device} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                border: "6px solid rgba(255,255,255,0.12)",
                borderRadius: 42,
                overflow: "hidden",
                background: "#000",
                boxShadow: "0 28px 64px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.07)",
                position: "relative",
                flexShrink: 0,
              }}>
                {/* Dynamic island */}
                <div style={{
                  position: "absolute", top: 9, left: "50%",
                  transform: "translateX(-50%)",
                  width: 80, height: 22,
                  background: "#000",
                  borderRadius: 12,
                  zIndex: 20,
                  pointerEvents: "none",
                }} />
                <div style={{
                  overflow: "hidden",
                  width: MOB_DISPLAY_W,
                  height: MOBILE_PREVIEW_VIEWPORT_H * mobScale,
                  position: "relative",
                }}>
                  <div
                    ref={mockRef}
                    style={{
                      transformOrigin: "top left",
                      transform: `scale(${mobScale})`,
                      width: MOBILE_W,
                      position: "absolute", top: 0, left: 0,
                    }}
                  >
                    {/* Notch spacer */}
                    <div style={{ height: 38, background: safeHex(palette.background) }} />
                    <MockPage brandName={brandName} vibe={vibe} palette={palette} device={device} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          Switch views to preview mobile and desktop layouts.
        </p>
        <button
          onClick={download}
          disabled={downloading}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {downloading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Exporting…</>
            : <><Download className="h-3.5 w-3.5" />Download PNG</>
          }
        </button>
      </div>
    </div>
  )
}
