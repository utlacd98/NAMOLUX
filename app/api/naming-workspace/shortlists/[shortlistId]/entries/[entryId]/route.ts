import { NextRequest } from "next/server"
import { z } from "zod"
import {
  deleteNamingShortlistEntry,
  setNamingShortlistWinner,
  updateNamingShortlistEntry,
  type NamingWorkspaceJsonObject,
} from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  namingWorkspaceNoContent,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const idSchema = z.string().uuid()
const jsonObjectSchema = z.object({}).catchall(z.unknown())
const updateEntrySchema = z.object({
  availabilitySnapshot: jsonObjectSchema.optional(),
  founderSignalSnapshot: jsonObjectSchema.nullable().optional(),
  tier: z.enum(["top", "consider", "reject"]).nullable().optional(),
  notes: z.string().trim().min(1).max(4000).nullable().optional(),
  position: z.number().int().min(0).max(10000).optional(),
  setWinner: z.literal(true).optional(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Provide at least one shortlist-entry update.",
})

type EntryRouteContext = {
  params: Promise<{ shortlistId: string; entryId: string }>
}

function parseId(value: string, errorCode: string): string {
  const parsed = idSchema.safeParse(value)
  if (!parsed.success) throw new Error(errorCode)
  return parsed.data
}

export async function PATCH(request: NextRequest, context: EntryRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const params = await context.params
    const shortlistId = parseId(params.shortlistId, "invalid_shortlist")
    const entryId = parseId(params.entryId, "invalid_entry")
    const input = await parseNamingWorkspaceJson(request, updateEntrySchema)
    const { setWinner, ...entryUpdate } = input
    let entry = null

    if (Object.keys(entryUpdate).length > 0) {
      entry = await updateNamingShortlistEntry({
        ...entryUpdate,
        shortlistId,
        entryId,
        availabilitySnapshot: entryUpdate.availabilitySnapshot as NamingWorkspaceJsonObject | undefined,
        founderSignalSnapshot: entryUpdate.founderSignalSnapshot as NamingWorkspaceJsonObject | null | undefined,
      })
    }
    if (setWinner) {
      entry = await setNamingShortlistWinner({ shortlistId, entryId })
    }

    return namingWorkspaceJson(entry)
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_shortlist") {
      return namingWorkspaceJson({ error: "invalid_shortlist", message: "The shortlist reference is invalid." }, 400)
    }
    if (error instanceof Error && error.message === "invalid_entry") {
      return namingWorkspaceJson({ error: "invalid_entry", message: "The shortlist-entry reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "entry_update_failed",
      message: "The shortlist entry could not be updated.",
    })
  }
}

export async function DELETE(request: NextRequest, context: EntryRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const params = await context.params
    await deleteNamingShortlistEntry({
      shortlistId: parseId(params.shortlistId, "invalid_shortlist"),
      entryId: parseId(params.entryId, "invalid_entry"),
    })
    return namingWorkspaceNoContent()
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_shortlist") {
      return namingWorkspaceJson({ error: "invalid_shortlist", message: "The shortlist reference is invalid." }, 400)
    }
    if (error instanceof Error && error.message === "invalid_entry") {
      return namingWorkspaceJson({ error: "invalid_entry", message: "The shortlist-entry reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "entry_deletion_failed",
      message: "The shortlist entry could not be deleted.",
    })
  }
}
