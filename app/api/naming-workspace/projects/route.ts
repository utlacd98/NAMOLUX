import { NextRequest } from "next/server"
import { z } from "zod"
import { createNamingProject } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  selectedBrandName: z.string().trim().min(1).max(120).nullable().optional(),
  businessDescription: z.string().trim().min(1).max(8000).nullable().optional(),
  category: z.string().trim().min(1).max(120).nullable().optional(),
  locale: z.string().trim().min(1).max(64).nullable().optional(),
}).strict()

export async function POST(request: NextRequest) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const input = await parseNamingWorkspaceJson(request, createProjectSchema)
    return namingWorkspaceJson(await createNamingProject(input), 201)
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "project_creation_failed",
      message: "The project could not be created.",
    })
  }
}
