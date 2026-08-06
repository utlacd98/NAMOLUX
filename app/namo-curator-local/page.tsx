import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { notFound } from "next/navigation"
import { NamingCuratorWorkspace } from "@/components/naming-curator/naming-curator-workspace"
import { PreviewCuratorAccess } from "@/components/naming-curator/preview-curator-access"
import { NAMING_SPECIALIST_BRIEFS } from "@/lib/naming-specialist/briefs"
import {
  isLocalCuratorRequest,
  isProtectedPreviewCuratorEnabled,
} from "@/lib/naming-specialist/local-access"
import {
  isValidPreviewCuratorToken,
  PREVIEW_CURATOR_COOKIE,
} from "@/lib/naming-specialist/preview-access"

export const metadata: Metadata = {
  title: "Founder naming curator | NamoLux local",
  description: "Local-only source-blind naming dataset curation workspace.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default async function NamingCuratorPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>
}) {
  const requestHeaders = await headers()
  const local = isLocalCuratorRequest(requestHeaders.get("host"))
  if (!local) {
    if (!isProtectedPreviewCuratorEnabled()) notFound()
    const cookieStore = await cookies()
    if (!isValidPreviewCuratorToken(cookieStore.get(PREVIEW_CURATOR_COOKIE)?.value)) {
      return <PreviewCuratorAccess invalid={(await searchParams).access === "invalid"} />
    }
  }

  return <NamingCuratorWorkspace briefs={NAMING_SPECIALIST_BRIEFS} previewMode={!local} />
}
