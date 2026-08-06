import { NextRequest } from "next/server"
import { z } from "zod"
import { createNamingDecisionReportShare } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const reportIdSchema = z.string().uuid()
const createShareSchema = z.object({
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict()

type ReportShareRouteContext = {
  params: Promise<{ reportId: string }>
}

export async function POST(request: NextRequest, context: ReportShareRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  const { reportId } = await context.params
  if (!reportIdSchema.safeParse(reportId).success) {
    return namingWorkspaceJson({ error: "invalid_report", message: "The report reference is invalid." }, 400)
  }

  try {
    const input = await parseNamingWorkspaceJson(request, createShareSchema)
    return namingWorkspaceJson(await createNamingDecisionReportShare({ reportId, ...input }), 201)
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "report_share_creation_failed",
      message: "The report link could not be created.",
    })
  }
}
