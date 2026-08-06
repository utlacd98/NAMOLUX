import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getSharedNamingDecisionReport,
  NamingWorkspaceError,
  type NamingWorkspaceJsonObject,
} from "@/lib/naming-workspace"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Shared decision report | NamoLux",
  robots: {
    index: false,
    follow: false,
  },
}

type SharedReportPageProps = {
  params: Promise<{ token: string }>
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function founderSignalLabel(snapshot: NamingWorkspaceJsonObject | null): string | null {
  if (!snapshot) return null
  const score = snapshot.score
  const band = textValue(snapshot.band)
  if (typeof score !== "number" || !Number.isFinite(score)) return band
  const roundedScore = Math.max(0, Math.min(100, Math.round(score)))
  return band ? String(roundedScore) + " / 100 · " + band : String(roundedScore) + " / 100"
}

function availabilityLabel(snapshot: NamingWorkspaceJsonObject, tld: string): string {
  const evidence = snapshot[tld]
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return "Availability snapshot saved"
  const status = textValue((evidence as Record<string, unknown>).status)
  if (!status) return "Availability snapshot saved"
  return status.replace(/[_-]+/g, " ")
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export default async function SharedNamingDecisionReportPage({ params }: SharedReportPageProps) {
  const { token } = await params
  let report: Awaited<ReturnType<typeof getSharedNamingDecisionReport>>

  try {
    report = await getSharedNamingDecisionReport(token)
  } catch (error) {
    if (error instanceof NamingWorkspaceError && error.code === "report_not_found") notFound()
    throw error
  }

  const { project, shortlist, entries } = report.snapshot
  const winner = entries.find((entry) => entry.isWinner)

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100 sm:px-6 sm:py-16">
      <article className="mx-auto w-full max-w-4xl">
        <div className="border-b border-amber-200/20 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">NamoLux · Shared decision report</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{report.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">
            {project.name} · {shortlist.title} · primary extension .{shortlist.primaryTld}
          </p>
          <p className="mt-2 text-xs text-stone-500">Snapshot created {formatDate(report.createdAt)}. This view is read-only.</p>
        </div>

        {winner ? (
          <section className="mt-8 rounded-2xl border border-amber-200/35 bg-amber-200/10 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Selected winner</p>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">{winner.candidateName}</h2>
                <p className="mt-1 text-sm text-amber-100/80">{winner.primaryDomain}</p>
              </div>
              {founderSignalLabel(winner.founderSignalSnapshot) ? (
                <p className="rounded-full border border-amber-200/30 px-3 py-1 text-sm text-amber-100">
                  Founder Signal {founderSignalLabel(winner.founderSignalSnapshot)}
                </p>
              ) : null}
            </div>
            {winner.notes ? <p className="mt-4 text-sm leading-6 text-stone-200">{winner.notes}</p> : null}
          </section>
        ) : null}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Candidate ledger</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">The evaluated shortlist</h2>
            </div>
            <p className="text-sm text-stone-400">{entries.length} candidate{entries.length === 1 ? "" : "s"}</p>
          </div>

          <ol className="mt-5 space-y-3">
            {entries.map((entry) => {
              const signal = founderSignalLabel(entry.founderSignalSnapshot)
              return (
                <li key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium text-white">{entry.candidateName}</h3>
                        {entry.isWinner ? <span className="rounded-full bg-amber-200/15 px-2 py-0.5 text-xs font-medium text-amber-100">Winner</span> : null}
                        {entry.tier ? <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs capitalize text-stone-300">{entry.tier}</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-stone-400">{entry.primaryDomain}</p>
                    </div>
                    {signal ? <p className="text-sm font-medium text-amber-100">Founder Signal {signal}</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-400">
                    <span>.{shortlist.primaryTld}: {availabilityLabel(entry.availabilitySnapshot, shortlist.primaryTld)}</span>
                    {entry.notes ? <span>Note: {entry.notes}</span> : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </article>
    </main>
  )
}
