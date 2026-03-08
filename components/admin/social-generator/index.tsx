"use client"

import { useState, useRef, useCallback } from "react"
import { CanvasPreview } from "./canvas-preview"
import { EditorPanel } from "./editor-panel"
import type { PostConfig, Preset } from "./types"
import { DEFAULT_CONFIG, PLATFORMS } from "./types"
import { Download, Save, Copy, ChevronDown, Trash2, Monitor } from "lucide-react"

// The right-panel preview is capped at this display width (px).
// The actual canvas renders at full platform resolution, then scales down.
const DISPLAY_MAX_WIDTH = 540

function loadPresets(): Preset[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem("namolux_social_presets") || "[]")
  } catch {
    return []
  }
}

function savePresets(presets: Preset[]) {
  localStorage.setItem("namolux_social_presets", JSON.stringify(presets))
}

export function SocialGenerator() {
  const [config, setConfig] = useState<PostConfig>(DEFAULT_CONFIG)
  const [exporting, setExporting] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets())
  const [presetName, setPresetName] = useState("")
  const [showPresets, setShowPresets] = useState(false)
  const [copied, setCopied] = useState(false)

  // This ref points to the FULL-RESOLUTION div, not the scaled preview wrapper
  const canvasRef = useRef<HTMLDivElement>(null)

  const platform = PLATFORMS[config.platform]
  const exportW = platform.width
  const exportH = platform.height

  // Scale factor so the preview fits nicely in the right panel
  const previewScale = Math.min(1, DISPLAY_MAX_WIDTH / exportW)
  const displayW = Math.round(exportW * previewScale)
  const displayH = Math.round(exportH * previewScale)

  function patch(partial: Partial<PostConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }))
  }

  const handleExport = useCallback(
    async (format: "png" | "jpeg") => {
      if (!canvasRef.current || exporting) return
      setExporting(true)
      try {
        // Wait for fonts and images to be ready
        await document.fonts.ready

        const imgs = Array.from(canvasRef.current.querySelectorAll("img"))
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve()
                  img.onerror = () => resolve()
                }),
          ),
        )

        const html2canvas = (await import("html2canvas")).default

        const canvas = await html2canvas(canvasRef.current, {
          // Capture at the full export size — the div IS already that size
          width: exportW,
          height: exportH,
          // 2× scale for retina-quality output
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: config.bgColor,
          // Ignore scroll offset — the div renders at top:0 left:0
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          windowWidth: exportW,
          windowHeight: exportH,
        })

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "_")
        const filename = `namolux_${config.platform}_${date}.${format}`
        const link = document.createElement("a")
        link.download = filename
        link.href =
          format === "jpeg"
            ? canvas.toDataURL("image/jpeg", 0.95)
            : canvas.toDataURL("image/png")
        link.click()
      } catch (err) {
        console.error("Export failed:", err)
        alert("Export failed — check console for details.")
      } finally {
        setExporting(false)
      }
    },
    [config, exportW, exportH, exporting],
  )

  function handleCopyCaption() {
    const caption = PLATFORMS[config.platform].caption
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSavePreset() {
    if (!presetName.trim()) return
    const preset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      config: { ...config },
      createdAt: new Date().toISOString(),
    }
    const next = [preset, ...presets]
    setPresets(next)
    savePresets(next)
    setPresetName("")
  }

  function handleLoadPreset(preset: Preset) {
    setConfig(preset.config)
    setShowPresets(false)
  }

  function handleDeletePreset(id: string) {
    const next = presets.filter((p) => p.id !== id)
    setPresets(next)
    savePresets(next)
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", color: "#fff" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(5,5,5,0.95)",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-black text-black"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
          >
            N
          </div>
          <div>
            <span className="text-sm font-bold text-white">Post Graphic Generator</span>
            <span
              className="ml-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(212,175,55,0.6)" }}
            >
              Admin Tool
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Presets dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Presets {presets.length > 0 && `(${presets.length})`}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showPresets && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl p-2"
                style={{
                  background: "rgba(12,12,12,0.98)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                }}
              >
                <div className="flex gap-2 mb-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                    placeholder="Preset name..."
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
                  >
                    Save
                  </button>
                </div>

                {presets.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                    No presets saved yet
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <button
                          className="flex-1 text-left text-xs text-white/70 hover:text-white transition-colors"
                          onClick={() => handleLoadPreset(p)}
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => handleDeletePreset(p.id)}
                          className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Copy caption */}
          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: copied ? "#4ade80" : "rgba(255,255,255,0.6)",
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy Caption"}
          </button>

          {/* Export PNG */}
          <button
            onClick={() => handleExport("png")}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-black transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "PNG"}
          </button>

          {/* Export JPG */}
          <button
            onClick={() => handleExport("jpeg")}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <Download className="h-3.5 w-3.5" />
            JPG
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex h-[calc(100vh-52px)]">
        {/* Left: Editor panel */}
        <div
          className="flex-shrink-0 overflow-y-auto p-5"
          style={{
            width: "340px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <EditorPanel config={config} onChange={patch} />
        </div>

        {/* Right: Preview panel */}
        <div
          className="flex-1 flex flex-col items-center justify-start gap-6 overflow-auto py-8 px-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          {/* Platform info */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Monitor className="h-3.5 w-3.5" style={{ color: "rgba(212,175,55,0.6)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {platform.label} — {exportW}×{exportH}px export &nbsp;·&nbsp; preview at{" "}
              {Math.round(previewScale * 100)}%
            </span>
          </div>

          {/*
           * DISPLAY wrapper — visual preview only, no ref.
           * The inner full-size div is CSS-scaled down. This wrapper clips it
           * to displayW × displayH for layout purposes.
           * The ref / capture target lives OUTSIDE any transform parent (below).
           */}
          <div
            style={{
              width: displayW,
              height: displayH,
              overflow: "hidden",
              flexShrink: 0,
              boxShadow:
                "0 40px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(212,175,55,0.1)",
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                width: exportW,
                height: exportH,
                pointerEvents: "none",
              }}
            >
              {/* Display copy — no ref */}
              <CanvasPreview
                config={config}
                exportWidth={exportW}
                exportHeight={exportH}
              />
            </div>
          </div>

          {/* Caption preview */}
          <div
            className="rounded-xl p-4 flex-shrink-0"
            style={{
              width: displayW,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "rgba(212,175,55,0.5)" }}
              >
                Caption — {platform.label}
              </span>
              <button
                onClick={handleCopyCaption}
                className="text-[10px] transition-colors"
                style={{ color: copied ? "#4ade80" : "rgba(255,255,255,0.3)" }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p
              className="text-xs leading-relaxed whitespace-pre-line"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {platform.caption}
            </p>
          </div>
        </div>
      </div>

      {/*
       * OFF-SCREEN CAPTURE TARGET — this is what html2canvas actually reads.
       * position:fixed + large negative left pushes it off-screen.
       * Crucially it has NO transformed parent, so html2canvas reads true pixel
       * dimensions for every element (no scale distortion → no 0-height canvases).
       */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: -(exportW + 200),
          width: exportW,
          height: exportH,
          pointerEvents: "none",
          zIndex: -9999,
        }}
        aria-hidden="true"
      >
        <CanvasPreview
          ref={canvasRef}
          config={config}
          exportWidth={exportW}
          exportHeight={exportH}
        />
      </div>
    </div>
  )
}
