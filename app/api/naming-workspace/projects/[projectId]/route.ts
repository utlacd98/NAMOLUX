import { NextRequest } from "next/server"
import { z } from "zod"
import { deleteNamingProject, updateNamingProject } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  namingWorkspaceNoContent,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const projectIdSchema = z.string().uuid()
const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  selectedBrandName: z.string().trim().min(1).max(120).nullable().optional(),
  businessDescription: z.string().trim().min(1).max(8000).nullable().optional(),
  category: z.string().trim().min(1).max(120).nullable().optional(),
  locale: z.string().trim().min(1).max(64).nullable().optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Provide at least one project update.",
})

type ProjectRouteContext = {
  params: Promise<{ projectId: string }>
}

function parseProjectId(projectId: string): string {
  const parsed = projectIdSchema.safeParse(projectId)
  if (!parsed.success) throw new Error("invalid_project")
  return parsed.data
}

export async function PATCH(request: NextRequest, context: ProjectRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const projectId = parseProjectId((await context.params).projectId)
    const input = await parseNamingWorkspaceJson(request, updateProjectSchema)
    return namingWorkspaceJson(await updateNamingProject({ projectId, ...input }))
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_project") {
      return namingWorkspaceJson({ error: "invalid_project", message: "The project reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "project_update_failed",
      message: "The project could not be updated.",
    })
  }
}

export async function DELETE(request: NextRequest, context: ProjectRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const projectId = parseProjectId((await context.params).projectId)
    await deleteNamingProject(projectId)
    return namingWorkspaceNoContent()
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_project") {
      return namingWorkspaceJson({ error: "invalid_project", message: "The project reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "project_deletion_failed",
      message: "The project could not be deleted.",
    })
  }
}
