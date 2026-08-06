"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { trackEvent } from "@/lib/analytics"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import styles from "./premium-home.module.css"

const EXAMPLE_SHORTLISTS = [
  { label: "Fintech", names: "Vaulten\nPaynest\nCountis\nLedgerly" },
  { label: "SaaS", names: "Northframe\nRelaydesk\nClearstack\nWorkhaven" },
  { label: "Wellness", names: "Stillwell\nKindreday\nRestory\nCalmfield" },
] as const

export function HomeShortlistForm({ compact = false }: { compact?: boolean }) {
  const [names, setNames] = useState("")
  const inputId = compact ? "final-shortlist" : "home-shortlist"

  return (
    <form
      action="/bulk-domain-check/workspace"
      method="get"
      className={compact ? styles.finalInputForm : styles.heroInputForm}
      onSubmit={() => {
        void trackEvent({
          action: "shortlist_created",
          metadata: { source: "home", ctaId: compact ? "home_final_shortlist" : "home_hero_shortlist" },
        })
      }}
    >
      <label htmlFor={inputId}>Paste one candidate name per line</label>
      <textarea
        id={inputId}
        name="names"
        rows={compact ? 3 : 5}
        minLength={2}
        maxLength={5000}
        required
        value={names}
        onChange={(event) => setNames(event.target.value)}
        placeholder={"northstar\nfieldnote\nbrightforge"}
      />
      {!compact ? (
        <div className={styles.exampleBriefs} aria-label="Example shortlists">
          <span>Try an example</span>
          {EXAMPLE_SHORTLISTS.map((example) => (
            <button key={example.label} type="button" onClick={() => setNames(example.names)}>
              {example.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.heroFormActions}>
        <button type="submit" className={`${styles.solidButton} ${styles.buttonBrass}`}>
          Check my shortlist
          <ArrowRight size={16} strokeWidth={1.6} />
        </button>
        {!compact ? <Link href="/founder-signal" className={styles.textLink}>How Founder Signal works</Link> : null}
      </div>
      <p className={styles.heroNote}>
        Up to 50 names per batch. {PRODUCT_OFFER.freeUsageLabel}. No account required to start.
      </p>
    </form>
  )
}
