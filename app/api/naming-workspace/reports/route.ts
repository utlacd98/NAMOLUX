import { NextRequest } from "next/server"
import { z } from "zod"
import { createNamingDecisionReport } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const createReportSchema = z.object({
  shortlistId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
}).strict()

export async function POST(request: NextRequest) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const input = await parseNamingWorkspaceJson(request, createReportSchema)
    return namingWorkspaceJson(await createNamingDecisionReport(input), 201)
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "report_creation_failed",
      message: "The decision report could not be created.",
    })
  }
}
