import { NextRequest } from "next/server"
import { z } from "zod"
import { deleteNamingShortlist, updateNamingShortlist } from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  namingWorkspaceNoContent,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const shortlistIdSchema = z.string().uuid()
const updateShortlistSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  primaryTld: z.enum(["com", "io", "co", "ai", "app", "dev"]).optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Provide at least one shortlist update.",
})

type ShortlistRouteContext = {
  params: Promise<{ shortlistId: string }>
}

function parseShortlistId(shortlistId: string): string {
  const parsed = shortlistIdSchema.safeParse(shortlistId)
  if (!parsed.success) throw new Error("invalid_shortlist")
  return parsed.data
}

export async function PATCH(request: NextRequest, context: ShortlistRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const shortlistId = parseShortlistId((await context.params).shortlistId)
    const input = await parseNamingWorkspaceJson(request, updateShortlistSchema)
    return namingWorkspaceJson(await updateNamingShortlist({ shortlistId, ...input }))
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_shortlist") {
      return namingWorkspaceJson({ error: "invalid_shortlist", message: "The shortlist reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "shortlist_update_failed",
      message: "The shortlist could not be updated.",
    })
  }
}

export async function DELETE(request: NextRequest, context: ShortlistRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const shortlistId = parseShortlistId((await context.params).shortlistId)
    await deleteNamingShortlist(shortlistId)
    return namingWorkspaceNoContent()
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_shortlist") {
      return namingWorkspaceJson({ error: "invalid_shortlist", message: "The shortlist reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "shortlist_deletion_failed",
      message: "The shortlist could not be deleted.",
    })
  }
}
