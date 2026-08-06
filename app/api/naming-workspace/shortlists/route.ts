import { NextRequest } from "next/server"
import { z } from "zod"
import { createNamingShortlist } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const createShortlistSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  primaryTld: z.enum(["com", "io", "co", "ai", "app", "dev"]).optional(),
}).strict()

export async function POST(request: NextRequest) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const input = await parseNamingWorkspaceJson(request, createShortlistSchema)
    return namingWorkspaceJson(await createNamingShortlist(input), 201)
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "shortlist_creation_failed",
      message: "The shortlist could not be created.",
    })
  }
}
