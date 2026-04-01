"use client"

import { useRef, useState, useEffect, useCallback } from "react"
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
const MOBILE_H  = 780
const DESKTOP_W = 1280
const DESKTOP_H = 720

function safeHex(c: PaletteColour) {
  return /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : "#888888"
}
function contrastText(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#000000" : "#ffffff"
}
// Lighten a hex by mixing with white
function lighten(hex: string, amt: number) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * amt))
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * amt))
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * amt))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

// ── Vibe copy — NEVER uses keywords, always punchy and short ──────────────────
const VIBE_COPY: Record<string, {
  badge: string
  headline: string[]  // 2 short lines
  sub: string
  cta: string
  ctaSecondary: string
  features: { icon: string; title: string; desc: string }[]
  bandHeadline: string
}> = {
  luxury: {
    badge: "New Collection",
    headline: ["Elevate your everyday.", "Live beautifully."],
    sub: "Where sophistication meets effortless living.",
    cta: "Explore Collection",
    ctaSecondary: "Our Story",
    features: [
      { icon: "◆", title: "Crafted with Intent",  desc: "Every detail considered. Nothing left to chance." },
      { icon: "◇", title: "Built to Last",         desc: "Quality that endures beyond seasons." },
      { icon: "○", title: "Yours, Exclusively",    desc: "Designed around you, and only you." },
    ],
    bandHeadline: "Begin your journey.",
  },
  futuristic: {
    badge: "Now in Beta",
    headline: ["The future is", "already here."],
    sub: "Built for what comes next — powered by AI.",
    cta: "Get Early Access",
    ctaSecondary: "See how it works",
    features: [
      { icon: "⬡", title: "AI-Powered",     desc: "Intelligent systems that learn and adapt." },
      { icon: "▲", title: "Blazing Fast",    desc: "Performance optimised at every layer." },
      { icon: "◈", title: "Scales Freely",   desc: "From zero to enterprise without friction." },
    ],
    bandHeadline: "Ready to build the future?",
  },
  playful: {
    badge: "Say hello 👋",
    headline: ["Where happiness", "finds its home."],
    sub: "Life's too short for boring tools.",
    cta: "Join the Fun",
    ctaSecondary: "Learn more",
    features: [
      { icon: "★", title: "Delightfully Easy", desc: "Simple for anyone. Powerful for everyone." },
      { icon: "♥", title: "Always Fresh",       desc: "New surprises around every corner." },
      { icon: "◉", title: "Made for You",        desc: "Personalised experiences that feel just right." },
    ],
    bandHeadline: "Your next favourite thing is waiting.",
  },
  trustworthy: {
    badge: "Trusted & Secure",
    headline: ["The platform", "you can count on."],
    sub: "Built on transparency, security, and reliability.",
    cta: "Start for Free",
    ctaSecondary: "View security",
    features: [
      { icon: "🔒", title: "Bank-Grade Security", desc: "Enterprise encryption on every account." },
      { icon: "✓",  title: "99.9% Uptime",         desc: "Always available when you need us." },
      { icon: "◎",  title: "24/7 Support",          desc: "Real humans ready to help anytime." },
    ],
    bandHeadline: "Trusted by thousands worldwide.",
  },
  minimal: {
    badge: "Simple & Focused",
    headline: ["Everything you need.", "Nothing you don't."],
    sub: "Clean, fast, and built for clarity.",
    cta: "Get Started",
    ctaSecondary: "See pricing",
    features: [
      { icon: "—", title: "Zero Clutter",    desc: "A focused interface that gets out of your way." },
      { icon: "◌", title: "Instant Setup",   desc: "Productive in under 60 seconds." },
      { icon: "□", title: "Works Anywhere",  desc: "Seamless across all your devices." },
    ],
    bandHeadline: "Less noise. More results.",
  },
}

// ── Hero visual — abstract UI decoration using brand colours ──────────────────
function HeroVisual({ p, mob, isLux }: { p: Record<string, string>; mob: boolean; isLux: boolean }) {
  const size = mob ? 140 : 220
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Outer glow ring */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${p.primary}22 0%, transparent 70%)`,
      }} />

      {/* Main card */}
      <div style={{
        position: "absolute",
        top: "10%", left: "10%",
        width: "68%", height: "68%",
        borderRadius: isLux ? 4 : 18,
        background: `linear-gradient(135deg, ${p.primary}ee, ${lighten(p.primary, 0.15)}dd)`,
        boxShadow: `0 20px 48px ${p.primary}45`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: mob ? 30 : 48,
          fontWeight: 900,
          color: contrastText(p.primary),
          opacity: 0.9,
          fontFamily: isLux ? "Georgia, serif" : "system-ui, sans-serif",
        }}>
          {/* First letter of brand */}
          {"\u00A0"}
        </span>
      </div>

      {/* Floating accent chip top-right */}
      <div style={{
        position: "absolute",
        top: "5%", right: "0%",
        background: p.accent,
        borderRadius: 999,
        width: mob ? 28 : 44,
        height: mob ? 28 : 44,
        boxShadow: `0 8px 24px ${p.accent}55`,
      }} />

      {/* Floating secondary chip bottom-left */}
      <div style={{
        position: "absolute",
        bottom: "8%", left: "2%",
        background: p.secondary,
        borderRadius: isLux ? 4 : 12,
        width: mob ? 22 : 36,
        height: mob ? 22 : 36,
        opacity: 0.85,
      }} />

      {/* Small dot */}
      <div style={{
        position: "absolute",
        bottom: "22%", right: "8%",
        background: p.accent,
        borderRadius: "50%",
        width: mob ? 8 : 12,
        height: mob ? 8 : 12,
        opacity: 0.6,
      }} />
    </div>
  )
}

// ── Mock landing page (rendered at full pixel size, then scaled) ───────────────
function MockPage({ brandName, vibe, palette, device }: Omit<LandingPreviewProps, "keywords"> & { device: Device }) {
  const p = {
    primary:   safeHex(palette.primary),
    secondary: safeHex(palette.secondary),
    accent:    safeHex(palette.accent),
    bg:        safeHex(palette.background),
    text:      safeHex(palette.text),
  }
  const copy = VIBE_COPY[vibe] ?? VIBE_COPY.minimal
  const mob  = device === "mobile"
  const isLux = vibe === "luxury"
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
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: mob ? "14px 20px" : "16px 60px",
        borderBottom: `1px solid ${p.text}10`,
        background: `${p.bg}f8`,
      }}>
        {/* Logo mark + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 26, height: 26,
            borderRadius: isLux ? 3 : 7,
            background: p.primary,
            display: "inline-block",
            flexShrink: 0,
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

        {/* Nav links — desktop */}
        {!mob && (
          <div style={{ display: "flex", gap: 28 }}>
            {["Features", "Pricing", "About"].map(item => (
              <span key={item} style={{
                fontSize: 13, color: `${p.text}65`,
                fontWeight: 500, cursor: "pointer",
              }}>{item}</span>
            ))}
          </div>
        )}

        {/* CTA button */}
        <button style={{
          background: p.primary, color: onPrimary,
          border: "none",
          borderRadius: isLux ? 2 : 8,
          padding: mob ? "7px 16px" : "9px 20px",
          fontSize: mob ? 11 : 13,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: isLux ? "0.06em" : 0,
          fontFamily: headFont,
          whiteSpace: "nowrap",
        }}>
          {mob ? "Start" : copy.cta}
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: mob ? "40px 24px 36px" : "64px 60px 56px",
        display: "flex",
        alignItems: "center",
        gap: mob ? 0 : 48,
        flexDirection: mob ? "column" : "row",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute",
          top: -60, right: mob ? -80 : -60,
          width: mob ? 280 : 500, height: mob ? 280 : 500,
          borderRadius: "50%",
          background: `${p.primary}12`,
          filter: "blur(50px)",
          pointerEvents: "none",
        }} />
        {isLux && (
          <div style={{
            position: "absolute", top: 0,
            left: mob ? 24 : 60, right: mob ? 24 : 60, height: 1,
            background: `linear-gradient(90deg, transparent, ${p.accent}60, transparent)`,
          }} />
        )}

        {/* Text block */}
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${p.accent}18`,
            border: `1px solid ${p.accent}35`,
            borderRadius: 999,
            padding: "4px 12px",
            marginBottom: mob ? 16 : 22,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: p.accent, whiteSpace: "nowrap" }}>
              {copy.badge}
            </span>
          </div>

          {/* Headline — 2 lines, tight */}
          <h1 style={{
            fontFamily: headFont,
            fontSize: mob ? 28 : 46,
            fontWeight: isLux ? 400 : 800,
            lineHeight: 1.1,
            color: p.text,
            margin: "0 0 14px",
            letterSpacing: isLux ? "-0.01em" : "-0.025em",
            fontStyle: isLux ? "italic" : "normal",
          }}>
            {copy.headline[0]}<br />{copy.headline[1]}
          </h1>

          {/* Sub — always short, never keywords */}
          <p style={{
            fontSize: mob ? 13 : 16,
            lineHeight: 1.6,
            color: `${p.text}70`,
            margin: "0 0 28px",
            maxWidth: 380,
          }}>
            {copy.sub}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{
              background: p.primary, color: onPrimary,
              border: "none",
              borderRadius: isLux ? 2 : 10,
              padding: mob ? "11px 22px" : "13px 28px",
              fontSize: mob ? 12 : 14,
              fontWeight: 700, cursor: "pointer",
              letterSpacing: isLux ? "0.08em" : 0,
              textTransform: isLux ? "uppercase" : "none",
              fontFamily: headFont,
              boxShadow: `0 6px 20px ${p.primary}35`,
              whiteSpace: "nowrap",
            }}>
              {copy.cta}
            </button>
            {!isLux && (
              <button style={{
                background: "transparent", color: p.text,
                border: `1.5px solid ${p.text}18`,
                borderRadius: 10,
                padding: mob ? "11px 18px" : "13px 22px",
                fontSize: mob ? 12 : 14,
                fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
                {copy.ctaSecondary}
              </button>
            )}
          </div>

          {/* Trust row — trustworthy only */}
          {vibe === "trustworthy" && !mob && (
            <div style={{ display: "flex", gap: 20, marginTop: 24, alignItems: "center" }}>
              {["256-bit TLS", "SOC 2 Type II", "GDPR Ready"].map(item => (
                <div key={item} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ color: p.accent, fontSize: 11, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 11, color: `${p.text}55` }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hero visual — right side desktop, below text mobile */}
        <div style={{ flexShrink: 0, marginTop: mob ? 32 : 0 }}>
          <HeroVisual p={p} mob={mob} isLux={isLux} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: mob ? "32px 24px" : "52px 60px",
        background: isLux ? `${p.text}04` : `${p.primary}08`,
        borderTop: `1px solid ${p.text}08`,
        borderBottom: `1px solid ${p.text}08`,
      }}>
        <p style={{
          fontFamily: headFont,
          fontSize: mob ? 11 : 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: `${p.text}40`,
          marginBottom: mob ? 20 : 32,
          textAlign: "center",
        }}>
          Why {brandName || "us"}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr",
          gap: mob ? 12 : 16,
        }}>
          {copy.features.map((f, i) => (
            <div key={i} style={{
              background: p.bg,
              border: `1px solid ${p.text}0c`,
              borderRadius: isLux ? 0 : 14,
              padding: mob ? "18px" : "22px 20px",
              borderTop: isLux ? `2px solid ${p.primary}` : "none",
            }}>
              <div style={{
                width: 34, height: 34,
                borderRadius: isLux ? 0 : 9,
                background: `${p.primary}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
                fontSize: 14, color: p.primary,
                fontWeight: 700,
              }}>
                {f.icon}
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
                color: `${p.text}58`, margin: 0,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section style={{
        padding: mob ? "40px 24px" : "64px 60px",
        textAlign: "center",
        background: isLux
          ? p.bg
          : `linear-gradient(135deg, ${p.primary}0e, ${p.accent}09)`,
      }}>
        <h2 style={{
          fontFamily: headFont,
          fontSize: mob ? 20 : 32,
          fontWeight: isLux ? 400 : 800,
          color: p.text,
          margin: "0 0 12px",
          fontStyle: isLux ? "italic" : "normal",
          letterSpacing: isLux ? "0.02em" : "-0.02em",
        }}>
          {copy.bandHeadline}
        </h2>
        <p style={{
          fontSize: mob ? 12 : 15,
          color: `${p.text}58`,
          marginBottom: 28,
        }}>
          {isLux ? "Discover the art of refined living." : "Join thousands already making the switch."}
        </p>
        <button style={{
          background: p.primary, color: onPrimary,
          border: "none",
          borderRadius: isLux ? 2 : 12,
          padding: mob ? "12px 30px" : "14px 40px",
          fontSize: mob ? 13 : 15,
          fontWeight: 700, cursor: "pointer",
          letterSpacing: isLux ? "0.1em" : 0,
          textTransform: isLux ? "uppercase" : "none",
          fontFamily: headFont,
          boxShadow: `0 8px 28px ${p.primary}38`,
        }}>
          {copy.cta}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: mob ? "16px 24px" : "20px 60px",
        borderTop: `1px solid ${p.text}0c`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
      }}>
        <span style={{
          fontFamily: headFont,
          fontSize: 12,
          fontWeight: isLux ? 400 : 600,
          letterSpacing: isLux ? "0.1em" : 0,
          textTransform: isLux ? "uppercase" : "none",
          color: `${p.text}45`,
        }}>
          {brandName || "Brand"}
        </span>
        <span style={{ fontSize: 10, color: `${p.text}28` }}>
          © {new Date().getFullYear()} {brandName || "Brand"}. All rights reserved.
        </span>
      </footer>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export function LandingPreview({ brandName, keywords, vibe, palette }: LandingPreviewProps) {
  const [device, setDevice]       = useState<Device>("mobile")
  const [downloading, setDownloading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mockRef    = useRef<HTMLDivElement>(null)
  const [wrapperWidth, setWrapperWidth] = useState(0)

  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver(e => setWrapperWidth(e[0].contentRect.width))
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Mobile: always 300px display width
  const MOB_DISPLAY_W = 280
  const mobScale   = MOB_DISPLAY_W / MOBILE_W
  const deskScale  = wrapperWidth > 0 ? (wrapperWidth - 32) / DESKTOP_W : 1

  const scale      = device === "mobile" ? mobScale : deskScale
  const W          = device === "mobile" ? MOBILE_W : DESKTOP_W
  const H          = device === "mobile" ? MOBILE_H : DESKTOP_H
  const displayH   = H * scale

  const download = useCallback(async () => {
    if (!mockRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(mockRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: safeHex(palette.background),
        width: W, height: H,
        windowWidth: W, windowHeight: H,
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

        {/* Device toggle */}
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

      {/* Preview */}
      <div className="p-4">
        {device === "desktop" ? (
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "rgba(20,20,25,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
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
                  color: "rgba(255,255,255,0.35)",
                  minWidth: 140, maxWidth: 240,
                }}
              >
                🔒 {(brandName || "brand").toLowerCase().replace(/\s+/g, "")}.com
              </div>
            </div>
            {/* Page */}
            <div style={{ overflow: "hidden", height: displayH, position: "relative" }}>
              <div
                ref={mockRef}
                style={{ transformOrigin: "top left", transform: `scale(${scale})`, width: W, position: "absolute", top: 0, left: 0 }}
              >
                <MockPage brandName={brandName} vibe={vibe} palette={palette} device={device} />
              </div>
            </div>
          </div>
        ) : (
          // Phone frame
          <div className="flex justify-center">
            <div style={{
              border: "6px solid rgba(255,255,255,0.12)",
              borderRadius: 40,
              overflow: "hidden",
              background: "#000",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.06)",
              position: "relative",
              flexShrink: 0,
            }}>
              {/* Dynamic island — sits inside the content, not overlapping */}
              <div style={{
                position: "absolute", top: 8, left: "50%",
                transform: "translateX(-50%)",
                width: 72, height: 18,
                background: "#000",
                borderRadius: 10,
                zIndex: 10,
                pointerEvents: "none",
              }} />

              {/* Page content with top padding for notch */}
              <div style={{
                overflow: "hidden",
                width: MOB_DISPLAY_W,
                height: MOBILE_H * mobScale,
                position: "relative",
              }}>
                <div
                  ref={mockRef}
                  style={{
                    transformOrigin: "top left",
                    transform: `scale(${mobScale})`,
                    width: MOBILE_W,
                    position: "absolute",
                    top: 0, left: 0,
                  }}
                >
                  {/* Add space for notch at the top of the page content */}
                  <div style={{ height: 36, background: safeHex(palette.background) }} />
                  <MockPage brandName={brandName} vibe={vibe} palette={palette} device={device} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
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
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting…</>
            : <><Download className="h-3.5 w-3.5" /> Download PNG</>
          }
        </button>
      </div>
    </div>
  )
}
