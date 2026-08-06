import { NextRequest } from "next/server"
import { z } from "zod"
import { revokeNamingDecisionReportShare } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  namingWorkspaceNoContent,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const shareIdSchema = z.string().uuid()

type ShareRouteContext = {
  params: Promise<{ shareId: string }>
}

export async function DELETE(request: NextRequest, context: ShareRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  const { shareId } = await context.params
  if (!shareIdSchema.safeParse(shareId).success) {
    return namingWorkspaceJson({ error: "invalid_report_share", message: "The report-share reference is invalid." }, 400)
  }

  try {
    await revokeNamingDecisionReportShare(shareId)
    return namingWorkspaceNoContent()
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "report_share_revocation_failed",
      message: "The report link could not be revoked.",
    })
  }
}
