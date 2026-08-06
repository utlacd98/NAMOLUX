"use client"

import type { MouseEventHandler } from "react"
import { CheckCircle2, CircleHelp, ShieldAlert, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type DomainCheckStatus = "available" | "taken" | "likely_available" | "needs_verification" | "error"
export type DomainStatus = "available" | "unavailable" | "unknown" | "verification-required"

export function resolveDomainStatus(status: DomainCheckStatus | undefined, available: boolean): DomainStatus {
  if (status === "available") return "available"
  if (status === "taken") return "unavailable"
  if (status === "likely_available" || status === "needs_verification") return "verification-required"
  if (status === "error") return "unknown"
  return available ? "verification-required" : "unknown"
}

const presentations = {
  available: {
    label: "Available",
    icon: CheckCircle2,
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  },
  unavailable: {
    label: "Unavailable",
    icon: XCircle,
    className: "border-white/10 bg-white/[0.03] text-white/42",
  },
  unknown: {
    label: "Unknown",
    icon: CircleHelp,
    className: "border-slate-300/20 bg-slate-300/[0.06] text-slate-200/70",
  },
  "verification-required": {
    label: "Verification required",
    icon: ShieldAlert,
    className: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
  },
} as const

interface DomainStatusChipProps {
  tld: string
  status?: DomainCheckStatus
  available: boolean
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}

export function DomainStatusChip({ tld, status, available, href, onClick, className }: DomainStatusChipProps) {
  const state = resolveDomainStatus(status, available)
  const presentation = presentations[state]
  const Icon = presentation.icon
  const content = (
    <>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>.{tld} {presentation.label}</span>
    </>
  )
  const classes = cn(
    "inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-4 sm:text-xs",
    presentation.className,
    className,
  )

  if (href && state !== "unavailable" && state !== "unknown") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={cn(classes, "transition hover:-translate-y-0.5 hover:brightness-110")}
        aria-label={`.${tld} domain: ${presentation.label}. Verify with registrar.`}
      >
        {content}
      </a>
    )
  }

  return <span className={classes} aria-label={`.${tld} domain: ${presentation.label}`}>{content}</span>
}
