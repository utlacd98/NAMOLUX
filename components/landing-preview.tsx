"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Monitor, Smartphone, Download, Loader2 } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
interface PaletteColour {
  hex: string
}

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

// ── Constants ──────────────────────────────────────────────────────────────────
const MOBILE_W = 390
const MOBILE_H = 844
const DESKTOP_W = 1280
const DESKTOP_H = 760

// ── Helpers ────────────────────────────────────────────────────────────────────
function safeHex(c: PaletteColour): string {
  return /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : "#888888"
}

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#000000" : "#ffffff"
}

// ── Copy generator ─────────────────────────────────────────────────────────────
function makeCopy(brandName: string, keywords: string, vibe: string) {
  const name = brandName || "Brand"
  const ctx = keywords.trim()

  const map: Record<string, { headline: string; sub: string; cta: string; ctaSecondary: string; features: { title: string; desc: string }[]; ctaBandHeadline: string }> = {
    luxury: {
      headline: `Elevate your everyday\nwith ${name}.`,
      sub: ctx ? `Where ${ctx} meets effortless elegance.` : "Where sophistication meets effortless living.",
      cta: "Explore the Collection",
      ctaSecondary: "Our Story",
      ctaBandHeadline: `Begin your journey with ${name}.`,
      features: [
        { title: "Crafted with Intent", desc: "Every detail considered. Nothing left to chance." },
        { title: "Built to Last", desc: "Quality that endures beyond seasons and trends." },
        { title: "Yours, Exclusively", desc: "A brand experience designed around you." },
      ],
    },
    futuristic: {
      headline: `The future of ${ctx || "your industry"}\nstarts here.`,
      sub: `${name} — engineered for what comes next.`,
      cta: "Get Early Access",
      ctaSecondary: "See how it works",
      ctaBandHeadline: `Ready to build the future?`,
      features: [
        { title: "AI-Powered", desc: "Intelligent systems that learn and adapt to you." },
        { title: "Lightning Fast", desc: "Performance optimised at every layer of the stack." },
        { title: "Built to Scale", desc: "From zero to enterprise without slowing down." },
      ],
    },
    playful: {
      headline: `Where happiness\nfinds its home.`,
      sub: ctx ? `${name} makes ${ctx} the best part of your day.` : `${name} — life's too short to be boring.`,
      cta: "Join the Fun",
      ctaSecondary: "Learn more",
      ctaBandHeadline: `Your next favourite thing is waiting.`,
      features: [
        { title: "Delightfully Easy", desc: "Simple for anyone. Powerful enough for everyone." },
        { title: "Always Fresh", desc: "New surprises waiting around every corner." },
        { title: "Made for You", desc: "Personalised experiences that feel just right." },
      ],
    },
    trustworthy: {
      headline: `${ctx ? ctx.charAt(0).toUpperCase() + ctx.slice(1) : "The platform"}\nyou can count on.`,
      sub: `${name} is built on transparency, security, and reliability.`,
      cta: "Start for Free",
      ctaSecondary: "View security",
      ctaBandHeadline: `Trusted by thousands worldwide.`,
      features: [
        { title: "Bank-Grade Security", desc: "Your data protected with enterprise-level encryption." },
        { title: "99.9% Uptime", desc: "Always available when you need us. Guaranteed." },
        { title: "Dedicated Support", desc: "Real humans ready to help, around the clock." },
      ],
    },
    minimal: {
      headline: `Simple. Powerful.\n${name}.`,
      sub: ctx ? `The cleaner way to handle ${ctx}.` : "Everything you need. Nothing you don't.",
      cta: "Get Started",
      ctaSecondary: "See pricing",
      ctaBandHeadline: `Less noise. More results.`,
      features: [
        { title: "Zero Clutter", desc: "A focused interface that gets out of your way." },
        { title: "Instant Setup", desc: "From sign-up to productive in under 60 seconds." },
        { title: "Works Everywhere", desc: "Seamless across all your devices." },
      ],
    },
  }

  return map[vibe] ?? map.minimal
}

// ── Mock landing page (unscaled, rendered at full pixel size) ──────────────────
function MockPage({
  brandName, keywords, vibe, palette, device,
}: LandingPreviewProps & { device: Device }) {
  const p = {
    primary:    safeHex(palette.primary),
    secondary:  safeHex(palette.secondary),
    accent:     safeHex(palette.accent),
    bg:         safeHex(palette.background),
    text:       safeHex(palette.text),
  }
  const copy = makeCopy(brandName, keywords, vibe)
  const mob = device === "mobile"
  const isLux = vibe === "luxury"
  const primaryOnPrimary = contrastText(p.primary)
  const headingFont = isLux
    ? "Georgia, 'Times New Roman', serif"
    : "'Inter', system-ui, -apple-system, sans-serif"

  const W = mob ? MOBILE_W : DESKTOP_W
  const featureIcons = ["◆", "▲", "●"]

  return (
    <div
      style={{
        width: W,
        minHeight: mob ? MOBILE_H : DESKTOP_H,
        background: p.bg,
        color: p.text,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* ── Navbar ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: mob ? "16px 20px" : "18px 64px",
          borderBottom: `1px solid ${p.text}12`,
          background: p.bg,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 30, height: 30,
              borderRadius: isLux ? 4 : 8,
              background: p.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800,
              color: primaryOnPrimary,
              fontFamily: headingFont,
              flexShrink: 0,
            }}
          >
            {(brandName || "B").charAt(0).toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: headingFont,
              fontWeight: isLux ? 400 : 700,
              fontSize: 15,
              letterSpacing: isLux ? "0.14em" : 0,
              textTransform: isLux ? "uppercase" : "none",
              color: p.text,
            }}
          >
            {brandName || "Brand"}
          </span>
        </div>

        {/* Nav links — desktop only */}
        {!mob && (
          <div style={{ display: "flex", gap: 32 }}>
            {["Features", "Pricing", "About"].map((item) => (
              <span
                key={item}
                style={{ fontSize: 14, color: `${p.text}75`, fontWeight: 500, cursor: "pointer" }}
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {/* CTA pill */}
        <button
          style={{
            background: p.primary, color: primaryOnPrimary,
            border: "none",
            borderRadius: isLux ? 0 : mob ? 24 : 8,
            padding: mob ? "9px 18px" : "10px 22px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            letterSpacing: isLux ? "0.07em" : 0,
            fontFamily: headingFont,
          }}
        >
          {mob ? "Start" : copy.cta}
        </button>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          padding: mob ? "52px 24px 44px" : "88px 64px 72px",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        {!isLux && (
          <div
            style={{
              position: "absolute",
              top: mob ? -80 : -120, right: mob ? -80 : -100,
              width: mob ? 260 : 480, height: mob ? 260 : 480,
              borderRadius: "50%",
              background: `${p.primary}16`,
              filter: "blur(60px)",
              pointerEvents: "none",
            }}
          />
        )}
        {isLux && (
          <div
            style={{
              position: "absolute", top: 0, left: mob ? 24 : 64, right: mob ? 24 : 64, height: 1,
              background: `linear-gradient(90deg, transparent, ${p.accent}50, transparent)`,
            }}
          />
        )}

        <div style={{ maxWidth: mob ? "100%" : 660, position: "relative" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `${p.accent}1a`,
              border: `1px solid ${p.accent}38`,
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: mob ? 20 : 28,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.accent }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: p.accent }}>
              {vibe === "futuristic" ? "Now in Beta" : isLux ? "New Collection" : vibe === "trustworthy" ? "Trusted & Secure" : "Introducing"}
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: headingFont,
              fontSize: mob ? (isLux ? 40 : 36) : isLux ? 62 : 56,
              fontWeight: isLux ? 400 : 800,
              lineHeight: 1.08,
              color: p.text,
              margin: "0 0 20px",
              letterSpacing: isLux ? "-0.01em" : "-0.025em",
              fontStyle: isLux ? "italic" : "normal",
              whiteSpace: "pre-line",
            }}
          >
            {copy.headline}
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: mob ? 15 : 18,
              lineHeight: 1.65,
              color: `${p.text}75`,
              margin: "0 0 36px",
              maxWidth: 500,
            }}
          >
            {copy.sub}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={{
                background: p.primary, color: primaryOnPrimary,
                border: "none", borderRadius: isLux ? 0 : 10,
                padding: mob ? "13px 28px" : "15px 36px",
                fontSize: mob ? 14 : 16, fontWeight: 700, cursor: "pointer",
                letterSpacing: isLux ? "0.1em" : 0,
                textTransform: isLux ? "uppercase" : "none",
                fontFamily: headingFont,
                boxShadow: `0 6px 24px ${p.primary}35`,
              }}
            >
              {copy.cta}
            </button>
            {!isLux && (
              <button
                style={{
                  background: "transparent", color: p.text,
                  border: `1.5px solid ${p.text}20`,
                  borderRadius: 10,
                  padding: mob ? "13px 22px" : "15px 28px",
                  fontSize: mob ? 14 : 16, fontWeight: 600, cursor: "pointer",
                }}
              >
                {copy.ctaSecondary}
              </button>
            )}
          </div>

          {/* Trust signals — trustworthy + desktop */}
          {vibe === "trustworthy" && !mob && (
            <div style={{ display: "flex", gap: 24, marginTop: 36, alignItems: "center" }}>
              {["256-bit encryption", "SOC 2 certified", "GDPR compliant"].map((item) => (
                <div key={item} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: p.accent, fontSize: 13, fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 12, color: `${p.text}60` }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section
        style={{
          padding: mob ? "40px 24px" : "64px 64px",
          background: isLux ? `${p.text}03` : `${p.primary}07`,
          borderTop: `1px solid ${p.text}0a`,
          borderBottom: `1px solid ${p.text}0a`,
        }}
      >
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: mob ? 22 : 32,
            fontWeight: isLux ? 400 : 700,
            color: p.text,
            marginBottom: mob ? 28 : 44,
            textAlign: "center",
            fontStyle: isLux ? "italic" : "normal",
            letterSpacing: isLux ? "0.03em" : "-0.015em",
          }}
        >
          {isLux ? `The ${brandName || "Brand"} Experience` : `Why choose ${brandName || "us"}?`}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr",
            gap: mob ? 14 : 20,
          }}
        >
          {copy.features.map((f, i) => (
            <div
              key={i}
              style={{
                background: p.bg,
                border: `1px solid ${p.text}0d`,
                borderRadius: isLux ? 0 : 16,
                padding: mob ? "20px" : "28px 24px",
                borderTop: isLux ? `2px solid ${p.primary}` : "none",
              }}
            >
              <div
                style={{
                  width: 38, height: 38,
                  borderRadius: isLux ? 0 : 10,
                  background: `${p.primary}1a`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                  fontSize: 16, color: p.primary,
                }}
              >
                {featureIcons[i]}
              </div>
              <h3
                style={{
                  fontFamily: headingFont,
                  fontSize: mob ? 15 : 17,
                  fontWeight: isLux ? 400 : 700,
                  color: p.text,
                  margin: "0 0 8px",
                  fontStyle: isLux ? "italic" : "normal",
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: `${p.text}62`, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section
        style={{
          padding: mob ? "48px 24px" : "80px 64px",
          textAlign: "center",
          background: isLux ? p.bg : `linear-gradient(135deg, ${p.primary}10, ${p.accent}08)`,
        }}
      >
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: mob ? 24 : 38,
            fontWeight: isLux ? 400 : 800,
            color: p.text,
            margin: "0 0 16px",
            fontStyle: isLux ? "italic" : "normal",
            letterSpacing: isLux ? "0.02em" : "-0.02em",
          }}
        >
          {copy.ctaBandHeadline}
        </h2>
        <p style={{ fontSize: mob ? 14 : 17, color: `${p.text}60`, marginBottom: 32 }}>
          {isLux ? "Discover the art of refined living." : "Join thousands already making the switch."}
        </p>
        <button
          style={{
            background: p.primary, color: primaryOnPrimary,
            border: "none", borderRadius: isLux ? 0 : 12,
            padding: mob ? "14px 36px" : "16px 48px",
            fontSize: mob ? 15 : 17, fontWeight: 700, cursor: "pointer",
            letterSpacing: isLux ? "0.1em" : 0,
            textTransform: isLux ? "uppercase" : "none",
            boxShadow: `0 10px 36px ${p.primary}40`,
            fontFamily: headingFont,
          }}
        >
          {copy.cta}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: mob ? "20px 24px" : "24px 64px",
          borderTop: `1px solid ${p.text}10`,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: headingFont,
            fontSize: 13, fontWeight: isLux ? 400 : 600,
            letterSpacing: isLux ? "0.1em" : 0,
            textTransform: isLux ? "uppercase" : "none",
            color: `${p.text}55`,
          }}
        >
          {brandName || "Brand"}
        </span>
        <span style={{ fontSize: 11, color: `${p.text}28` }}>
          © {new Date().getFullYear()} {brandName || "Brand"}. All rights reserved.
        </span>
      </footer>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export function LandingPreview({ brandName, keywords, vibe, palette }: LandingPreviewProps) {
  const [device, setDevice] = useState<Device>("mobile")
  const [downloading, setDownloading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mockRef = useRef<HTMLDivElement>(null)
  const [wrapperWidth, setWrapperWidth] = useState(0)

  // Track wrapper width for desktop scale
  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver((entries) => {
      setWrapperWidth(entries[0].contentRect.width)
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Scale calculation
  const MOB_DISPLAY_W = 300          // phone frame content width
  const mobScale = MOB_DISPLAY_W / MOBILE_W
  const deskScale = wrapperWidth > 0 ? (wrapperWidth - 32) / DESKTOP_W : 1  // 32 = 2×p-4 padding

  const scale = device === "mobile" ? mobScale : deskScale
  const W = device === "mobile" ? MOBILE_W : DESKTOP_W
  const H = device === "mobile" ? MOBILE_H : DESKTOP_H
  const displayH = H * scale

  // Download — capture the unscaled inner div at 2× for sharpness
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
        width: W,
        height: H,
        windowWidth: W,
        windowHeight: H,
      })
      const link = document.createElement("a")
      link.download = `${(brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-${device}-preview.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch {
      // silently fail — not critical
    } finally {
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
      {/* ── Header ── */}
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
          {(["mobile", "desktop"] as Device[]).map((d) => {
            const Icon = d === "mobile" ? Smartphone : Monitor
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition-all"
                style={
                  device === d
                    ? {
                        background: "rgba(212,175,55,0.15)",
                        color: "#D4AF37",
                        border: "1px solid rgba(212,175,55,0.28)",
                      }
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

      {/* ── Preview ── */}
      <div className="p-4">
        {device === "desktop" ? (
          // Browser chrome frame
          <div
            className="overflow-hidden rounded-xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {/* Browser bar */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: "rgba(20,20,25,0.95)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57", "#ffbc2e", "#28c840"].map((c) => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
              </div>
              <div
                className="mx-auto flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)",
                  minWidth: 140,
                  maxWidth: 260,
                }}
              >
                🔒 {(brandName || "brand").toLowerCase().replace(/\s+/g, "")}.com
              </div>
            </div>

            {/* Scaled page */}
            <div style={{ overflow: "hidden", height: displayH, position: "relative" }}>
              <div
                ref={mockRef}
                style={{
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                  width: W,
                  position: "absolute",
                  top: 0, left: 0,
                }}
              >
                <MockPage brandName={brandName} keywords={keywords} vibe={vibe} palette={palette} device={device} />
              </div>
            </div>
          </div>
        ) : (
          // Phone frame
          <div className="flex justify-center">
            <div
              style={{
                border: "7px solid rgba(255,255,255,0.14)",
                borderRadius: 44,
                overflow: "hidden",
                background: "#000",
                boxShadow: "0 28px 64px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.07)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Dynamic island notch */}
              <div
                style={{
                  position: "absolute", top: 8, left: "50%",
                  transform: "translateX(-50%)",
                  width: 88, height: 22,
                  background: "#000",
                  borderRadius: 14,
                  zIndex: 10,
                }}
              />
              {/* Side button */}
              <div
                style={{
                  position: "absolute", right: -9, top: 100,
                  width: 3, height: 48,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                }}
              />

              {/* Scaled page content */}
              <div
                style={{
                  overflow: "hidden",
                  width: MOB_DISPLAY_W,
                  height: MOBILE_H * mobScale,
                  position: "relative",
                }}
              >
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
                  <MockPage brandName={brandName} keywords={keywords} vibe={vibe} palette={palette} device={device} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer bar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
          Mockup generated from your brand colours and vibe. Switch views to preview mobile and desktop.
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
          {downloading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting…</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> Download PNG</>
          )}
        </button>
      </div>
    </div>
  )
}
