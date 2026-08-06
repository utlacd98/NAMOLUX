import { NextRequest } from "next/server"
import { z } from "zod"
import { deleteNamingDecisionReport } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  namingWorkspaceNoContent,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const reportIdSchema = z.string().uuid()

type ReportRouteContext = {
  params: Promise<{ reportId: string }>
}

export async function DELETE(request: NextRequest, context: ReportRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  const { reportId } = await context.params
  if (!reportIdSchema.safeParse(reportId).success) {
    return namingWorkspaceJson({ error: "invalid_report", message: "The report reference is invalid." }, 400)
  }

  try {
    await deleteNamingDecisionReport(reportId)
    return namingWorkspaceNoContent()
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "report_deletion_failed",
      message: "The decision report could not be deleted.",
    })
  }
}
