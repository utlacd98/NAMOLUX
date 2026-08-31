"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import styles from "./premium-home.module.css"

const EXAMPLE_BRIEFS = [
  { label: "Fintech", brief: "A trustworthy fintech platform that protects small-business cash flow and makes every transaction feel clear." },
  { label: "Wellness", brief: "A calm premium wellness app that helps busy professionals build sustainable sleep and recovery habits." },
  { label: "AI productivity", brief: "An intelligent productivity assistant for creative teams that turns scattered ideas into focused plans." },
] as const

export function HomeBriefForm({ compact = false }: { compact?: boolean }) {
  const [brief, setBrief] = useState("")
  const inputId = compact ? "final-brief" : "home-brief"

  return (
    <form
      action="/generate"
      method="get"
      className={compact ? styles.finalInputForm : styles.heroInputForm}
      onSubmit={() => {
        void trackEvent({
          action: "brief_submitted",
          metadata: { source: "home", ctaId: compact ? "home_final_brief" : "home_hero_brief" },
        })
      }}
    >
      <input type="hidden" name="source" value="home" />
      <label htmlFor={inputId}>What are you building?</label>
      <textarea
        id={inputId}
        name="q"
        rows={compact ? 2 : 3}
        minLength={2}
        maxLength={1000}
        required
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        placeholder="A bookkeeping platform for independent consultants…"
      />
      {!compact ? (
        <div className={styles.exampleBriefs} aria-label="Example naming briefs">
          <span>Try an example</span>
          {EXAMPLE_BRIEFS.map((example) => (
            <button key={example.label} type="button" onClick={() => setBrief(example.brief)} aria-label={`Use the ${example.label} example brief`}>
              {example.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.heroFormActions}>
        <button type="submit" className={`${styles.solidButton} ${styles.buttonBrass}`}>
          Start Name Sprint
          <ArrowRight size={16} strokeWidth={1.6} />
        </button>
        {!compact ? <Link href="/bulk-domain-check" className={styles.textLink}>Paste a shortlist instead</Link> : null}
      </div>
      <p className={styles.heroNote}>{PRODUCT_OFFER.freeQuickUsageLabel}. Sign-in required.</p>
    </form>
  )
}
