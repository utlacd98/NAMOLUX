import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BulkDecisionWorkspace } from "@/components/bulk-decision-workspace"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { isDecisionWorkspaceEnabled } from "@/lib/decision-workspace"

export const metadata: Metadata = {
  title: "Bulk domain check workspace | NamoLux",
  description: "Check up to 50 candidate names across six domain extensions and add Founder Signal scoring when you want a ranked decision view.",
  alternates: { canonical: "/bulk-domain-check" },
  robots: { index: false, follow: false },
}

type BulkWorkspacePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function BulkWorkspacePage({ searchParams }: BulkWorkspacePageProps) {
  if (!isDecisionWorkspaceEnabled()) redirect("/bulk-domain-check?workspace=paused")

  const params = await searchParams
  const rawNames = Array.isArray(params?.names) ? params.names[0] : params?.names
  const initialNames = (rawNames || "").slice(0, 5000)

  return (
    <>
      <Navbar />
      <div className="pt-[78px]">
        <BulkDecisionWorkspace initialNames={initialNames} />
      </div>
      <Footer />
    </>
  )
}
