"use client"

import { useRef } from "react"
import type { PostConfig, TemplateId, PlatformId } from "./types"
import { PLATFORMS } from "./types"

interface EditorPanelProps {
  config: PostConfig
  onChange: (patch: Partial<PostConfig>) => void
}

const TEMPLATE_LABELS: Record<TemplateId, { label: string; desc: string }> = {
  A: { label: "Product Showcase", desc: "Headline + phone mockups + features" },
  B: { label: "Name Spotlight", desc: "Domain name with Founder Signal score" },
  C: { label: "Comparison", desc: "NamoLux vs competitor feature grid" },
  D: { label: "Stat / Quote", desc: "Large number or quote post" },
  E: { label: "Tip / Insight", desc: "Numbered tips with headline" },
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none resize-none"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    />
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.15)" }} />
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.5)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.15)" }} />
    </div>
  )
}

export function EditorPanel({ config, onChange }: EditorPanelProps) {
  const file1Ref = useRef<HTMLInputElement>(null)
  const file2Ref = useRef<HTMLInputElement>(null)

  function handleImage(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      const next = [...config.screenshots]
      next[index] = base64
      onChange({ screenshots: next })
    }
    reader.readAsDataURL(file)
  }

  function removeImage(index: number) {
    const next = [...config.screenshots]
    next.splice(index, 1)
    onChange({ screenshots: next })
  }

  function updateListItem(field: keyof PostConfig, index: number, value: string) {
    const arr = [...(config[field] as string[])]
    arr[index] = value
    onChange({ [field]: arr } as Partial<PostConfig>)
  }

  function addListItem(field: keyof PostConfig, defaultValue: string) {
    onChange({ [field]: [...(config[field] as string[]), defaultValue] } as Partial<PostConfig>)
  }

  function removeListItem(field: keyof PostConfig, index: number) {
    const arr = [...(config[field] as string[])]
    arr.splice(index, 1)
    onChange({ [field]: arr } as Partial<PostConfig>)
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {/* Template picker */}
      <div>
        <Label>Template</Label>
        <div className="grid grid-cols-1 gap-1.5">
          {(Object.entries(TEMPLATE_LABELS) as [TemplateId, { label: string; desc: string }][]).map(
            ([id, { label, desc }]) => (
              <button
                key={id}
                onClick={() => onChange({ template: id })}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
                style={{
                  background:
                    config.template === id
                      ? "rgba(212,175,55,0.12)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    config.template === id
                      ? "1px solid rgba(212,175,55,0.35)"
                      : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black"
                  style={{
                    background:
                      config.template === id
                        ? "linear-gradient(135deg, #D4AF37, #F6E27A)"
                        : "rgba(255,255,255,0.07)",
                    color: config.template === id ? "#000" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {id}
                </div>
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: config.template === id ? "#F6E27A" : "rgba(255,255,255,0.7)" }}
                  >
                    {label}
                  </p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {desc}
                  </p>
                </div>
              </button>
            ),
          )}
        </div>
      </div>

      <Divider label="Platform" />

      {/* Platform picker */}
      <div>
        <Label>Platform & Size</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(PLATFORMS) as [PlatformId, (typeof PLATFORMS)[PlatformId]][]).map(([id, p]) => (
            <button
              key={id}
              onClick={() => onChange({ platform: id })}
              className="rounded-lg px-2 py-2 text-center text-xs transition-all"
              style={{
                background:
                  config.platform === id ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                border:
                  config.platform === id
                    ? "1px solid rgba(212,175,55,0.35)"
                    : "1px solid rgba(255,255,255,0.07)",
                color: config.platform === id ? "#F6E27A" : "rgba(255,255,255,0.5)",
                fontWeight: config.platform === id ? 700 : 400,
              }}
            >
              <div className="font-semibold">{p.label}</div>
              <div className="text-[10px] opacity-50">
                {p.width}×{p.height}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Divider label="Content" />

      {/* Common fields */}
      <div>
        <Label>Headline</Label>
        <Textarea
          value={config.headline}
          onChange={(v) => onChange({ headline: v })}
          placeholder="Enter headline..."
          rows={2}
        />
      </div>

      <div>
        <Label>Subtitle / Body</Label>
        <Input
          value={config.subtitle}
          onChange={(v) => onChange({ subtitle: v })}
          placeholder="Supporting text..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>CTA Text</Label>
          <Input
            value={config.ctaText}
            onChange={(v) => onChange({ ctaText: v })}
            placeholder="TRY IT FREE →"
          />
        </div>
        <div>
          <Label>CTA URL</Label>
          <Input
            value={config.ctaUrl}
            onChange={(v) => onChange({ ctaUrl: v })}
            placeholder="NAMOLUX.COM"
          />
        </div>
      </div>

      {/* Template-specific fields */}
      {config.template === "A" && (
        <>
          <Divider label="Template A — Features" />
          <div>
            <Label>Bullet Features</Label>
            <div className="flex flex-col gap-1.5">
              {config.features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={f} onChange={(v) => updateListItem("features", i, v)} placeholder={`Feature ${i + 1}`} />
                  <button
                    onClick={() => removeListItem("features", i)}
                    className="shrink-0 rounded px-2 text-white/30 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addListItem("features", "New feature")}
                className="text-xs text-left px-1 py-1 transition-colors"
                style={{ color: "rgba(212,175,55,0.6)" }}
              >
                + Add feature
              </button>
            </div>
          </div>
        </>
      )}

      {config.template === "B" && (
        <>
          <Divider label="Template B — Name Spotlight" />
          <div>
            <Label>Domain Name</Label>
            <Input
              value={config.domainName}
              onChange={(v) => onChange({ domainName: v })}
              placeholder="CloudSync.io"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Score (0–100)</Label>
              <Input
                type="number"
                value={config.score}
                onChange={(v) => onChange({ score: parseInt(v) || 0 })}
              />
            </div>
            <div>
              <Label>Score Label</Label>
              <Input
                value={config.scoreLabel}
                onChange={(v) => onChange({ scoreLabel: v })}
                placeholder="Elite Brand Score"
              />
            </div>
          </div>
          <div>
            <Label>Traits</Label>
            <div className="flex flex-col gap-1.5">
              {config.traits.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={t} onChange={(v) => updateListItem("traits", i, v)} placeholder={`Trait ${i + 1}`} />
                  <button
                    onClick={() => removeListItem("traits", i)}
                    className="shrink-0 rounded px-2 text-white/30 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addListItem("traits", "New trait")}
                className="text-xs text-left px-1 py-1"
                style={{ color: "rgba(212,175,55,0.6)" }}
              >
                + Add trait
              </button>
            </div>
          </div>
        </>
      )}

      {config.template === "C" && (
        <>
          <Divider label="Template C — Comparison" />
          <div>
            <Label>Competitor Name</Label>
            <Input
              value={config.competitor}
              onChange={(v) => onChange({ competitor: v })}
              placeholder="Namelix"
            />
          </div>
          <div>
            <Label>NamoLux Features (✓)</Label>
            <div className="flex flex-col gap-1.5">
              {config.ourFeatures.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={f} onChange={(v) => updateListItem("ourFeatures", i, v)} />
                  <button onClick={() => removeListItem("ourFeatures", i)} className="shrink-0 rounded px-2 text-white/30 hover:text-red-400 transition-colors text-sm">✕</button>
                </div>
              ))}
              <button onClick={() => addListItem("ourFeatures", "")} className="text-xs text-left px-1 py-1" style={{ color: "rgba(212,175,55,0.6)" }}>+ Add</button>
            </div>
          </div>
          <div>
            <Label>Competitor Features (✗)</Label>
            <div className="flex flex-col gap-1.5">
              {config.theirFeatures.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={f} onChange={(v) => updateListItem("theirFeatures", i, v)} />
                  <button onClick={() => removeListItem("theirFeatures", i)} className="shrink-0 rounded px-2 text-white/30 hover:text-red-400 transition-colors text-sm">✕</button>
                </div>
              ))}
              <button onClick={() => addListItem("theirFeatures", "")} className="text-xs text-left px-1 py-1" style={{ color: "rgba(212,175,55,0.6)" }}>+ Add</button>
            </div>
          </div>
        </>
      )}

      {config.template === "D" && (
        <>
          <Divider label="Template D — Stat / Quote" />
          <div>
            <Label>Big Stat / Number</Label>
            <Input
              value={config.statNumber}
              onChange={(v) => onChange({ statNumber: v })}
              placeholder="10,000+"
            />
          </div>
          <div>
            <Label>Supporting Label</Label>
            <Input
              value={config.statLabel}
              onChange={(v) => onChange({ statLabel: v })}
              placeholder="startup names generated"
            />
          </div>
        </>
      )}

      {config.template === "E" && (
        <>
          <Divider label="Template E — Tips" />
          <div>
            <Label>Tips (3–5)</Label>
            <div className="flex flex-col gap-1.5">
              {config.tips.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={t} onChange={(v) => updateListItem("tips", i, v)} placeholder={`Tip ${i + 1}`} />
                  <button onClick={() => removeListItem("tips", i)} className="shrink-0 rounded px-2 text-white/30 hover:text-red-400 transition-colors text-sm">✕</button>
                </div>
              ))}
              {config.tips.length < 5 && (
                <button onClick={() => addListItem("tips", "")} className="text-xs text-left px-1 py-1" style={{ color: "rgba(212,175,55,0.6)" }}>+ Add tip</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Screenshots */}
      {(config.template === "A") && (
        <>
          <Divider label="Screenshots" />
          <div>
            <Label>Phone Screenshot 1</Label>
            <div className="flex items-center gap-2">
              <input
                ref={file1Ref}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleImage(0, e)}
              />
              <button
                onClick={() => file1Ref.current?.click()}
                className="flex-1 rounded-lg py-2 text-sm transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {config.screenshots[0] ? "✓ Screenshot 1 loaded" : "Upload screenshot 1"}
              </button>
              {config.screenshots[0] && (
                <button onClick={() => removeImage(0)} className="text-white/30 hover:text-red-400 text-sm px-1">✕</button>
              )}
            </div>
          </div>
          <div>
            <Label>Phone Screenshot 2</Label>
            <div className="flex items-center gap-2">
              <input
                ref={file2Ref}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleImage(1, e)}
              />
              <button
                onClick={() => file2Ref.current?.click()}
                className="flex-1 rounded-lg py-2 text-sm transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {config.screenshots[1] ? "✓ Screenshot 2 loaded" : "Upload screenshot 2"}
              </button>
              {config.screenshots[1] && (
                <button onClick={() => removeImage(1)} className="text-white/30 hover:text-red-400 text-sm px-1">✕</button>
              )}
            </div>
          </div>
        </>
      )}

      <Divider label="Style" />

      {/* Colors + font sizes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Background</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-8 w-8 rounded cursor-pointer border-0"
              style={{ background: "none" }}
            />
            <Input value={config.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          </div>
        </div>
        <div>
          <Label>Accent Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="h-8 w-8 rounded cursor-pointer border-0"
              style={{ background: "none" }}
            />
            <Input value={config.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          </div>
        </div>
      </div>

      <div>
        <Label>Headline Font Size: {config.headlineFontSize}px</Label>
        <input
          type="range"
          min={24}
          max={72}
          value={config.headlineFontSize}
          onChange={(e) => onChange({ headlineFontSize: parseInt(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>

      <div>
        <Label>Body Font Size: {config.bodyFontSize}px</Label>
        <input
          type="range"
          min={10}
          max={24}
          value={config.bodyFontSize}
          onChange={(e) => onChange({ bodyFontSize: parseInt(e.target.value) })}
          className="w-full accent-amber-400"
        />
      </div>
    </div>
  )
}
