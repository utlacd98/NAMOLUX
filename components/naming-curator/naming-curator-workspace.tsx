"use client"

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Download,
  FileUp,
  Flag,
  Save,
  ShieldCheck,
  Star,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { NamingSpecialistBrief } from "@/lib/naming-specialist/briefs"
import { resolveCurationDraft } from "@/lib/naming-specialist/curation"
import type {
  ApprovedSpecialistName,
  CurationDraft,
  CuratorAddition,
  CuratorCandidateDecision,
  CuratorRating,
  SourceBlindCuratorPack,
} from "@/lib/naming-specialist/types"
import { findCurationWarnings } from "@/lib/naming-specialist/validation"
import {
  CURATOR_PROGRESS_STORAGE_KEY,
  createCurationDraft,
  normalizeApprovedRanks,
  parseCuratorProgress,
  parseSourceBlindWorkspace,
  serializeCuratorProgress,
  upsertCandidateDecision,
  type LocalCuratorProgress,
  type SourceBlindWorkspaceFile,
} from "@/lib/naming-specialist/workspace"
import styles from "./naming-curator.module.css"

const CURATOR_WORKSPACE_STORAGE_KEY = "namolux_naming_curator_blind_packs_v1"
const RATINGS: CuratorRating[] = ["Great", "Good", "Average", "Reject"]

type ApprovedEntry = {
  origin: "candidate" | "addition"
  id: string
  name: string
  rank: number
}

function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function labelFromId(id: string): string {
  return id.replace(/^(?:train|validation|test)-/, "").replace(/-/g, " ")
}

function normalizedName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function rankTier(rank: number) {
  if (rank <= 8) return "lead" as const
  if (rank <= 16) return "strong" as const
  return "exploratory" as const
}

function briefDraft(briefId: string, pack?: SourceBlindCuratorPack): CurationDraft {
  return createCurationDraft(pack?.packId || `awaiting-capture:${briefId}`)
}

function approvedEntries(draft: CurationDraft, pack?: SourceBlindCuratorPack): ApprovedEntry[] {
  const namesBySlot = new Map(pack?.slots.map((slot) => [slot.blindSlotId, slot.name || ""]) || [])
  return [
    ...draft.decisions.filter((decision) => decision.approved).map((decision) => ({
      origin: "candidate" as const,
      id: decision.blindSlotId,
      name: decision.editedName?.trim() || namesBySlot.get(decision.blindSlotId) || "Unnamed",
      rank: decision.rank || Number.MAX_SAFE_INTEGER,
    })),
    ...draft.additions.filter((addition) => addition.approved).map((addition) => ({
      origin: "addition" as const,
      id: addition.additionId,
      name: addition.name.trim() || "Unnamed",
      rank: addition.rank || Number.MAX_SAFE_INTEGER,
    })),
  ].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id))
}

function previewApprovedNames(draft: CurationDraft, pack?: SourceBlindCuratorPack): ApprovedSpecialistName[] {
  const slots = new Map(pack?.slots.map((slot) => [slot.blindSlotId, slot]) || [])
  const captured = draft.decisions.filter((decision) => decision.approved).map((decision) => {
    const slot = slots.get(decision.blindSlotId)
    const rank = decision.rank || 999
    return {
      approvedId: `candidate:${decision.blindSlotId}`,
      origin: "captured" as const,
      blindSlotId: decision.blindSlotId,
      additionId: null,
      name: decision.editedName?.trim() || slot?.name || "",
      rationale: slot?.rationale || "Pending founder rationale",
      rating: decision.rating === "Reject" ? "Average" as const : decision.rating,
      shortlisted: decision.shortlisted,
      rank,
      rankTier: decision.rankTier || rankTier(rank),
      conceptFamily: decision.conceptFamily || "",
      visibleAffixes: decision.visibleAffixes || [],
    }
  })
  const additions = draft.additions.filter((addition) => addition.approved).map((addition) => {
    const rank = addition.rank || 999
    return {
      approvedId: `addition:${addition.additionId}`,
      origin: "curator_addition" as const,
      blindSlotId: null,
      additionId: addition.additionId,
      name: addition.name,
      rationale: addition.rationale || "Pending founder rationale",
      rating: addition.rating === "Reject" ? "Average" as const : addition.rating,
      shortlisted: addition.shortlisted,
      rank,
      rankTier: addition.rankTier || rankTier(rank),
      conceptFamily: addition.conceptFamily || "",
      visibleAffixes: addition.visibleAffixes || [],
    }
  })
  return [...captured, ...additions]
}

function statusDot(draft: CurationDraft | undefined) {
  if (draft?.status === "pass_ready") return `${styles.dot} ${styles.dotReady}`
  if (draft?.shortfall) return `${styles.dot} ${styles.dotFlagged}`
  if (draft && (draft.decisions.length || draft.additions.length)) return `${styles.dot} ${styles.dotStarted}`
  return styles.dot
}

export function NamingCuratorWorkspace({
  briefs,
  previewMode = false,
}: {
  briefs: readonly NamingSpecialistBrief[]
  previewMode?: boolean
}) {
  const [workspace, setWorkspace] = useState<SourceBlindWorkspaceFile>({
    schemaVersion: 1,
    datasetId: "naming-specialist-pilot-v1",
    packs: [],
  })
  const [drafts, setDrafts] = useState<Record<string, CurationDraft>>({})
  const [activeBriefId, setActiveBriefId] = useState(briefs[0]?.id || "")
  const [filter, setFilter] = useState("")
  const [notice, setNotice] = useState(previewMode
    ? "Protected preview test mode. Use this to assess the workflow; complete real curation on localhost."
    : "Candidate capture is waiting for founder approval. The 80 editorial briefs are ready to inspect offline.")
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [newRationale, setNewRationale] = useState("")
  const [exporting, setExporting] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const workspaceInput = useRef<HTMLInputElement>(null)
  const progressInput = useRef<HTMLInputElement>(null)

  const packsByBrief = useMemo(
    () => new Map(workspace.packs.map((pack) => [pack.brief.id, pack])),
    [workspace.packs],
  )
  const activeIndex = Math.max(0, briefs.findIndex((brief) => brief.id === activeBriefId))
  const activeBrief = briefs[activeIndex] || briefs[0]
  const currentPack = activeBrief ? packsByBrief.get(activeBrief.id) : undefined
  const currentDraft = activeBrief
    ? drafts[activeBrief.id] || briefDraft(activeBrief.id, currentPack)
    : null

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        const savedWorkspace = window.localStorage.getItem(CURATOR_WORKSPACE_STORAGE_KEY)
        if (savedWorkspace) setWorkspace(parseSourceBlindWorkspace(JSON.parse(savedWorkspace)))
        const savedProgress = window.localStorage.getItem(CURATOR_PROGRESS_STORAGE_KEY)
        if (savedProgress) {
          const progress = parseCuratorProgress(savedProgress)
          setDrafts(progress.drafts)
          if (progress.activeBriefId && briefs.some((brief) => brief.id === progress.activeBriefId)) {
            setActiveBriefId(progress.activeBriefId)
          }
        }
      } catch (restoreError) {
        setError(restoreError instanceof Error ? `Local resume data could not be restored: ${restoreError.message}` : "Local resume data could not be restored")
      } finally {
        setHydrated(true)
      }
    })
    return () => { cancelled = true }
  }, [briefs])

  useEffect(() => {
    if (!hydrated) return
    const progress: LocalCuratorProgress = {
      schemaVersion: 1,
      datasetId: workspace.datasetId,
      activeBriefId: activeBriefId || null,
      drafts,
    }
    window.localStorage.setItem(CURATOR_PROGRESS_STORAGE_KEY, serializeCuratorProgress(progress))
  }, [activeBriefId, drafts, hydrated, workspace.datasetId])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(CURATOR_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
  }, [hydrated, workspace])

  if (!activeBrief || !currentDraft) return null

  const updateDraft = (updater: (draft: CurationDraft) => CurationDraft) => {
    setDrafts((current) => {
      const existing = current[activeBrief.id]
      const base = existing?.packId === (currentPack?.packId || existing?.packId)
        ? existing
        : briefDraft(activeBrief.id, currentPack)
      return { ...current, [activeBrief.id]: normalizeApprovedRanks(updater(base || briefDraft(activeBrief.id, currentPack))) }
    })
    setError("")
  }

  const candidateSlots = currentPack?.slots.filter((slot) => slot.status === "available") || []
  const pendingSlots = currentPack?.slots.filter((slot) => slot.status === "pending").length || 0
  const unavailableSlots = currentPack?.slots.filter((slot) => slot.status === "unavailable").length || 0
  const reviewedCount = currentDraft.decisions.length
  const ranked = approvedEntries(currentDraft, currentPack)
  const approvedCount = ranked.length
  const completion = Math.round((briefs.filter((brief) => drafts[brief.id]?.status === "pass_ready").length / briefs.length) * 100)
  const warnings = findCurationWarnings(previewApprovedNames(currentDraft, currentPack))

  const globalApproved = briefs.flatMap((brief) => {
    const draft = drafts[brief.id]
    if (!draft) return []
    return approvedEntries(draft, packsByBrief.get(brief.id)).map((entry) => ({ ...entry, briefId: brief.id }))
  })
  const globalDuplicateNames = new Set(
    Array.from(globalApproved.reduce((groups, entry) => {
      const key = normalizedName(entry.name)
      if (key) groups.set(key, [...(groups.get(key) || []), entry])
      return groups
    }, new Map<string, Array<ApprovedEntry & { briefId: string }>>()).entries())
      .filter(([, entries]) => entries.length > 1)
      .map(([key]) => key),
  )

  const visibleSlots = candidateSlots.filter((slot) => {
    const decision = currentDraft.decisions.find((entry) => entry.blindSlotId === slot.blindSlotId)
    const query = filter.trim().toLowerCase()
    if (!query) return true
    return `${decision?.editedName || slot.name || ""} ${decision?.rating || "unrated"}`.toLowerCase().includes(query)
  })

  const changeDecision = (blindSlotId: string, patch: Partial<Omit<CuratorCandidateDecision, "blindSlotId">>) => {
    updateDraft((draft) => upsertCandidateDecision(draft, blindSlotId, patch))
  }

  const changeAddition = (additionId: string, patch: Partial<CuratorAddition>) => {
    updateDraft((draft) => ({
      ...draft,
      status: "draft",
      additions: draft.additions.map((addition) => addition.additionId === additionId ? { ...addition, ...patch } : addition),
    }))
  }

  const moveRank = (entry: ApprovedEntry, direction: -1 | 1) => {
    const target = ranked[ranked.findIndex((item) => item.id === entry.id && item.origin === entry.origin) + direction]
    if (!target) return
    updateDraft((draft) => ({
      ...draft,
      decisions: draft.decisions.map((decision) => {
        if (entry.origin === "candidate" && decision.blindSlotId === entry.id) return { ...decision, rank: target.rank }
        if (target.origin === "candidate" && decision.blindSlotId === target.id) return { ...decision, rank: entry.rank }
        return decision
      }),
      additions: draft.additions.map((addition) => {
        if (entry.origin === "addition" && addition.additionId === entry.id) return { ...addition, rank: target.rank }
        if (target.origin === "addition" && addition.additionId === target.id) return { ...addition, rank: entry.rank }
        return addition
      }),
    }))
  }

  const importWorkspace = async (file: File | undefined) => {
    if (!file) return
    try {
      const imported = parseSourceBlindWorkspace(JSON.parse(await file.text()))
      const knownIds = new Set(briefs.map((brief) => brief.id))
      const unknown = imported.packs.find((pack) => !knownIds.has(pack.brief.id))
      if (unknown) throw new Error(`Unknown pilot brief: ${unknown.brief.id}`)
      setWorkspace(imported)
      setDrafts((current) => {
        const next = { ...current }
        for (const pack of imported.packs) {
          const existing = next[pack.brief.id]
          if (!existing || existing.packId !== pack.packId) {
            const fresh = briefDraft(pack.brief.id, pack)
            fresh.additions = existing?.additions || []
            next[pack.brief.id] = fresh
          }
        }
        return next
      })
      setNotice(`Loaded ${imported.packs.length} source-blind brief pack${imported.packs.length === 1 ? "" : "s"}. Provider identity was not imported.`)
      setError("")
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The source-blind workspace could not be imported")
    } finally {
      if (workspaceInput.current) workspaceInput.current.value = ""
    }
  }

  const importProgress = async (file: File | undefined) => {
    if (!file) return
    try {
      const progress = parseCuratorProgress(await file.text())
      if (progress.datasetId !== workspace.datasetId) throw new Error("This progress file belongs to another dataset")
      setDrafts(progress.drafts)
      if (progress.activeBriefId && briefs.some((brief) => brief.id === progress.activeBriefId)) setActiveBriefId(progress.activeBriefId)
      setNotice("Founder review progress restored. Local autosave is active.")
      setError("")
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Progress could not be imported")
    } finally {
      if (progressInput.current) progressInput.current.value = ""
    }
  }

  const exportProgress = () => {
    downloadText("namolux-curator-pass-1-progress.json", serializeCuratorProgress({
      schemaVersion: 1,
      datasetId: workspace.datasetId,
      activeBriefId: activeBrief.id,
      drafts,
    }))
    setNotice("A local progress backup was downloaded. It contains curation decisions, never provider provenance.")
  }

  const exportPortableDataset = async () => {
    setExporting(true)
    setError("")
    try {
      const response = await fetch("/namo-curator-local/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace,
          progress: {
            schemaVersion: 1,
            datasetId: workspace.datasetId,
            activeBriefId: activeBrief.id,
            drafts,
          },
        }),
      })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || "The portable export failed validation")
      downloadText("namolux-naming-specialist-portable-dataset-v1.json", `${JSON.stringify(result, null, 2)}\n`)
      setNotice("Portable train, validation and internal-test artifacts were generated locally. Nothing was uploaded.")
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The portable export could not be generated")
    } finally {
      setExporting(false)
    }
  }

  const addFounderName = () => {
    const name = normalizedName(newName)
    if (!name) {
      setError("Add a name before saving the founder candidate.")
      return
    }
    updateDraft((draft) => ({
      ...draft,
      additions: [...draft.additions, {
        additionId: `founder_${crypto.randomUUID()}`,
        name,
        rationale: newRationale.trim(),
        rating: "Average",
        shortlisted: false,
        approved: false,
        criticalDefect: null,
        conceptFamily: "",
        visibleAffixes: [],
      }],
    }))
    setNewName("")
    setNewRationale("")
    setNotice(`Added ${name} as a founder-written candidate. It still needs a rating and decision.`)
  }

  const finalizeBrief = () => {
    if (!currentPack) {
      setError("Import the source-blind candidate pack before marking this brief pass-ready.")
      return
    }
    try {
      const readyDraft: CurationDraft = { ...currentDraft, status: "pass_ready", shortfall: null }
      resolveCurationDraft(currentPack, readyDraft)
      setDrafts((current) => ({ ...current, [activeBrief.id]: readyDraft }))
      setNotice("Brief marked pass-ready. The portable exporter will validate it again before producing JSONL.")
      setError("")
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : "This brief is not pass-ready")
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandLockup}>
          <div className={styles.monogram} aria-hidden="true">N</div>
          <div>
            <p className={styles.eyebrow}>Local founder tool · review pass one</p>
            <h1 className={styles.title}>Founder Curation Lab</h1>
            <p className={styles.subtitle}>Advanced internal evaluation for blind model comparison, benchmark review, ranking, collision detection, dataset quality control, and future preference-pair approval.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <input ref={workspaceInput} className={styles.srOnly} type="file" accept="application/json,.json" onChange={(event) => void importWorkspace(event.target.files?.[0])} />
          <input ref={progressInput} className={styles.srOnly} type="file" accept="application/json,.json" onChange={(event) => void importProgress(event.target.files?.[0])} />
          <button className={styles.buttonQuiet} type="button" onClick={() => progressInput.current?.click()}><FileUp size={15} /> Restore progress</button>
          <button className={styles.button} type="button" onClick={() => workspaceInput.current?.click()}><ShieldCheck size={15} /> Import blind packs</button>
          <button className={styles.buttonPrimary} type="button" onClick={exportProgress}><Download size={15} /> Back up progress</button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Pilot briefs">
          <p className={styles.sidebarTitle}>80 editorial briefs</p>
          <div className={styles.statusRow}>
            <span className={styles.pill}>{briefs.filter((brief) => brief.split === "train").length} train</span>
            <span className={styles.pillMuted}>{briefs.filter((brief) => brief.split === "validation").length} validation</span>
            <span className={styles.pillMuted}>{briefs.filter((brief) => brief.split === "test").length} test</span>
          </div>
          <div className={styles.progressTrack} aria-label={`${completion}% of briefs pass-ready`}>
            <span className={styles.progressFill} style={{ width: `${completion}%` }} />
          </div>
          <nav className={styles.briefList}>
            {briefs.map((brief, index) => (
              <button
                key={brief.id}
                type="button"
                className={`${styles.briefButton} ${brief.id === activeBrief.id ? styles.briefButtonActive : ""}`}
                onClick={() => setActiveBriefId(brief.id)}
                aria-current={brief.id === activeBrief.id ? "step" : undefined}
              >
                <span className={styles.briefIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.briefListName}>{labelFromId(brief.id)}</span>
                <span className={statusDot(drafts[brief.id])} aria-hidden="true" />
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.main}>
          <section className={styles.briefHero} aria-labelledby="active-brief-heading">
            <div className={styles.statusRow}>
              <span className={styles.pill}>{activeBrief.split}</span>
              <span className={styles.pillMuted}>{activeBrief.vibe}</span>
              <span className={styles.pillMuted}>{activeBrief.creativity}</span>
              <span className={styles.pillMuted}>max {activeBrief.maxChars} characters</span>
              {activeBrief.locale ? <span className={styles.pillMuted}>{activeBrief.locale}</span> : null}
            </div>
            <h2 id="active-brief-heading" className={styles.briefHeading}>{activeBrief.description}</h2>
            <div className={styles.metaList}>
              {activeBrief.rhymeWith ? <span className={styles.pill}>Sound reference: {activeBrief.rhymeWith}</span> : null}
              {activeBrief.blacklist?.map((term) => <span key={term} className={styles.pillDanger}>Block: {term}</span>)}
              {activeBrief.preferences?.likedStyles?.map((style) => <span key={style} className={styles.pillSuccess}>Likes: {style.replace(/_/g, " ")}</span>)}
            </div>
          </section>

          {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
          {previewMode ? <div className={styles.notice} role="status">Preview data stays in this browser profile. Do not import real paid-provider capture packs here; use the localhost curator for the real dataset.</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          <div className={styles.toolbar}>
            <div>
              <p className={styles.sectionLabel}>Source-blind candidate review</p>
              <div className={styles.statusRow}>
                <span className={styles.pillMuted}>{candidateSlots.length} available</span>
                {pendingSlots ? <span className={styles.pill}>{pendingSlots} pending</span> : null}
                {unavailableSlots ? <span className={styles.pillDanger}>{unavailableSlots} unavailable</span> : null}
              </div>
            </div>
            <input className={styles.input} style={{ maxWidth: "17rem" }} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter names or ratings" aria-label="Filter candidates" />
          </div>

          {!currentPack ? (
            <div className={styles.emptyState}>
              <strong>No model candidates have been generated.</strong><br />
              This is intentional: all 2,880 provider slots remain behind the founder’s spend approval. After an approved offline capture, import only the source-blind pack here; provider and model identity live in a separate private provenance file.
            </div>
          ) : null}

          <div className={styles.candidateGrid}>
            {visibleSlots.map((slot) => {
              const decision = currentDraft.decisions.find((entry) => entry.blindSlotId === slot.blindSlotId)
              const rating = decision?.rating
              const critical = Boolean(decision?.criticalDefect)
              const name = decision?.editedName ?? slot.name ?? ""
              return (
                <article key={slot.blindSlotId} className={`${styles.candidate} ${decision?.approved ? styles.candidateApproved : ""} ${critical ? styles.candidateCritical : ""}`}>
                  <div className={styles.candidateTop}>
                    <div>
                      <input className={styles.nameInput} value={name} onChange={(event) => changeDecision(slot.blindSlotId, { editedName: normalizedName(event.target.value) })} aria-label={`Edit candidate ${slot.name}`} />
                      <p className={styles.rationale}>{slot.rationale || "No candidate rationale was captured. Add one before export."}</p>
                    </div>
                    <div className={styles.candidateControls}>
                      <div className={styles.ratingRow} aria-label={`Rate ${name}`}>
                        {RATINGS.map((value) => (
                          <button key={value} type="button" className={`${styles.ratingButton} ${rating === value ? styles.ratingActive : ""}`} onClick={() => changeDecision(slot.blindSlotId, {
                            rating: value,
                            ...(value === "Reject" ? { approved: false, shortlisted: false } : {}),
                          })}>{value}</button>
                        ))}
                      </div>
                      <div className={styles.buttonRow}>
                        <label className={styles.checkboxLabel}><input type="checkbox" checked={Boolean(decision?.shortlisted)} disabled={rating === "Reject" || critical} onChange={(event) => changeDecision(slot.blindSlotId, { shortlisted: event.target.checked })} /> <Star size={14} /> Shortlist</label>
                        <label className={styles.checkboxLabel}><input type="checkbox" checked={Boolean(decision?.approved)} disabled={!rating || rating === "Reject" || critical} onChange={(event) => changeDecision(slot.blindSlotId, { approved: event.target.checked })} /> <Check size={14} /> Approve</label>
                        <button type="button" className={critical ? styles.button : styles.buttonQuiet} onClick={() => changeDecision(slot.blindSlotId, {
                          criticalDefect: critical ? null : { code: "founder-critical", note: "" },
                          ...(!critical ? { approved: false, shortlisted: false } : {}),
                        })}><Flag size={14} /> Critical defect</button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.candidateDetails}>
                    <div className={styles.field}><label htmlFor={`family-${slot.blindSlotId}`}>Concept family</label><input id={`family-${slot.blindSlotId}`} className={styles.input} value={decision?.conceptFamily || ""} onChange={(event) => changeDecision(slot.blindSlotId, { conceptFamily: event.target.value })} placeholder="e.g. calm handover" /></div>
                    <div className={styles.field}><label htmlFor={`affix-${slot.blindSlotId}`}>Visible affixes</label><input id={`affix-${slot.blindSlotId}`} className={styles.input} value={decision?.visibleAffixes?.join(", ") || ""} onChange={(event) => changeDecision(slot.blindSlotId, { visibleAffixes: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="e.g. flow, ly" /></div>
                    <div className={styles.field}><label htmlFor={`note-${slot.blindSlotId}`}>{critical ? "Critical-defect note" : "Review note"}</label><input id={`note-${slot.blindSlotId}`} className={styles.input} value={critical ? decision?.criticalDefect?.note || "" : decision?.notes || ""} onChange={(event) => critical ? changeDecision(slot.blindSlotId, { criticalDefect: { code: "founder-critical", note: event.target.value } }) : changeDecision(slot.blindSlotId, { notes: event.target.value })} /></div>
                  </div>
                </article>
              )
            })}
          </div>

          <section className={styles.addPanel} aria-labelledby="add-founder-name">
            <p id="add-founder-name" className={styles.sectionLabel}>Add a founder-written candidate</p>
            <div className={styles.candidateDetails} style={{ padding: 0, border: 0, background: "transparent" }}>
              <div className={styles.field}><label htmlFor="new-founder-name">Name</label><input id="new-founder-name" className={styles.input} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="lowercase name" /></div>
              <div className={styles.field} style={{ gridColumn: "span 2" }}><label htmlFor="new-founder-rationale">Why it fits this brief</label><input id="new-founder-rationale" className={styles.input} value={newRationale} onChange={(event) => setNewRationale(event.target.value)} placeholder="One honest, brief-specific sentence" /></div>
            </div>
            <button type="button" className={styles.button} onClick={addFounderName}><CirclePlus size={15} /> Add candidate</button>
          </section>

          {currentDraft.additions.length ? (
            <section style={{ marginTop: "1rem" }}>
              <p className={styles.sectionLabel}>Founder additions</p>
              <div className={styles.candidateGrid}>
                {currentDraft.additions.map((addition) => (
                  <article key={addition.additionId} className={`${styles.candidate} ${addition.approved ? styles.candidateApproved : ""} ${addition.criticalDefect ? styles.candidateCritical : ""}`}>
                    <div className={styles.candidateTop}>
                      <div>
                        <input className={styles.nameInput} value={addition.name} onChange={(event) => changeAddition(addition.additionId, { name: normalizedName(event.target.value) })} aria-label="Edit founder-added name" />
                        <textarea className={styles.textarea} value={addition.rationale} onChange={(event) => changeAddition(addition.additionId, { rationale: event.target.value })} aria-label={`Rationale for ${addition.name}`} />
                      </div>
                      <div className={styles.candidateControls}>
                        <div className={styles.ratingRow}>{RATINGS.map((value) => <button key={value} type="button" className={`${styles.ratingButton} ${addition.rating === value ? styles.ratingActive : ""}`} onClick={() => changeAddition(addition.additionId, { rating: value, ...(value === "Reject" ? { approved: false, shortlisted: false } : {}) })}>{value}</button>)}</div>
                        <div className={styles.buttonRow}>
                          <label className={styles.checkboxLabel}><input type="checkbox" checked={addition.shortlisted} disabled={addition.rating === "Reject" || Boolean(addition.criticalDefect)} onChange={(event) => changeAddition(addition.additionId, { shortlisted: event.target.checked })} /> <Star size={14} /> Shortlist</label>
                          <label className={styles.checkboxLabel}><input type="checkbox" checked={addition.approved} disabled={addition.rating === "Reject" || Boolean(addition.criticalDefect)} onChange={(event) => changeAddition(addition.additionId, { approved: event.target.checked })} /> <Check size={14} /> Approve</label>
                          <button type="button" className={addition.criticalDefect ? styles.button : styles.buttonQuiet} onClick={() => changeAddition(addition.additionId, { criticalDefect: addition.criticalDefect ? null : { code: "founder-critical", note: "" }, ...(!addition.criticalDefect ? { approved: false, shortlisted: false } : {}) })}><Flag size={14} /> Critical defect</button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.candidateDetails}>
                      <div className={styles.field}><label>Concept family</label><input className={styles.input} value={addition.conceptFamily || ""} onChange={(event) => changeAddition(addition.additionId, { conceptFamily: event.target.value })} /></div>
                      <div className={styles.field}><label>Visible affixes</label><input className={styles.input} value={addition.visibleAffixes?.join(", ") || ""} onChange={(event) => changeAddition(addition.additionId, { visibleAffixes: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></div>
                      <div className={styles.field}><label>{addition.criticalDefect ? "Critical-defect note" : "Review note"}</label><input className={styles.input} value={addition.criticalDefect?.note || addition.notes || ""} onChange={(event) => addition.criticalDefect ? changeAddition(addition.additionId, { criticalDefect: { code: "founder-critical", note: event.target.value } }) : changeAddition(addition.additionId, { notes: event.target.value })} /></div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className={styles.buttonRow} style={{ justifyContent: "space-between", marginTop: "1.2rem" }}>
            <button className={styles.buttonQuiet} type="button" disabled={activeIndex === 0} onClick={() => setActiveBriefId(briefs[activeIndex - 1].id)}><ChevronLeft size={15} /> Previous brief</button>
            <button className={styles.button} type="button" disabled={activeIndex === briefs.length - 1} onClick={() => setActiveBriefId(briefs[activeIndex + 1].id)}>Next brief <ChevronRight size={15} /></button>
          </div>
        </main>

        <aside className={styles.rail} aria-label="Review status and ranking">
          <section className={styles.railSection}>
            <p className={styles.sectionLabel}>Review status</p>
            <div className={styles.metricGrid}>
              <div className={styles.metric}><strong>{reviewedCount}/{candidateSlots.length}</strong><span>candidates rated</span></div>
              <div className={styles.metric}><strong>{approvedCount}/24</strong><span>approved names</span></div>
              <div className={styles.metric}><strong>{ranked.filter((entry) => entry.rank <= 8).length}/8</strong><span>lead tier</span></div>
              <div className={styles.metric}><strong>{warnings.length + globalDuplicateNames.size}</strong><span>warnings</span></div>
            </div>
          </section>

          <section className={styles.railSection}>
            <p className={styles.sectionLabel}>Approved ranking</p>
            {ranked.length ? <div className={styles.rankList}>{ranked.map((entry, index) => (
              <div key={`${entry.origin}:${entry.id}`} className={styles.rankItem}>
                <span className={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.rankName}>{entry.name}</span>
                <span className={styles.rankActions}>
                  <button className={styles.iconButton} type="button" disabled={index === 0} onClick={() => moveRank(entry, -1)} aria-label={`Move ${entry.name} up`}><ArrowUp size={13} /></button>
                  <button className={styles.iconButton} type="button" disabled={index === ranked.length - 1} onClick={() => moveRank(entry, 1)} aria-label={`Move ${entry.name} down`}><ArrowDown size={13} /></button>
                </span>
              </div>
            ))}</div> : <div className={styles.emptyState}>Approve names to build the 1–24 ranking.</div>}
          </section>

          <section className={styles.railSection}>
            <p className={styles.sectionLabel}>Collision warnings</p>
            <div className={styles.warningList}>
              {globalDuplicateNames.size ? <div className={styles.warningCard}><strong>Dataset duplicate</strong><p>An approved name is also approved on another brief. Export will be blocked.</p></div> : null}
              {warnings.map((warning, index) => <div key={`${warning.code}:${warning.key || index}`} className={styles.warningCard}><strong>{warning.code.replace(/_/g, " ")}</strong><p>{warning.message}</p></div>)}
              {!warnings.length && !globalDuplicateNames.size ? <div className={styles.emptyState}>No approved-name collision detected yet.</div> : null}
            </div>
          </section>

          <section className={styles.railSection}>
            <p className={styles.sectionLabel}>Honest quality gate</p>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={Boolean(currentDraft.shortfall)} onChange={(event) => updateDraft((draft) => ({
                ...draft,
                status: "draft",
                shortfall: event.target.checked ? { code: "insufficient_quality", note: draft.shortfall?.note || "" } : null,
              }))} />
              <AlertTriangle size={14} /> Cannot honestly reach 24
            </label>
            {currentDraft.shortfall ? <textarea className={styles.textarea} style={{ marginTop: "0.6rem" }} value={currentDraft.shortfall.note} onChange={(event) => updateDraft((draft) => ({ ...draft, shortfall: { code: "insufficient_quality", note: event.target.value } }))} placeholder="Explain the quality gap; never pad with weak names." /> : null}
          </section>

          <section className={styles.railSection}>
            <button className={styles.buttonPrimary} style={{ width: "100%" }} type="button" onClick={finalizeBrief} disabled={Boolean(currentDraft.shortfall)}><Save size={15} /> Mark pass-ready</button>
            <p className={styles.rationale}>Requires 24 unique ranked names, complete decisions, no critical defects, valid families and no hard collision.</p>
          </section>

          <section className={styles.railSection}>
            <button className={styles.button} style={{ width: "100%" }} type="button" onClick={() => void exportPortableDataset()} disabled={exporting}>
              <Download size={15} /> {exporting ? "Validating…" : "Build portable dataset"}
            </button>
            <p className={styles.rationale}>Runs the frozen-corpus, PII, split, duplicate and hash checks locally. It never uploads or starts training.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
