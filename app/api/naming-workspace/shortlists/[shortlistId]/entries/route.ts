import { NextRequest } from "next/server"
import { z } from "zod"
import {
  createNamingShortlistEntry,
  type NamingWorkspaceJsonObject,
} from "@/lib/naming-workspace"
import {
  namingWorkspaceErrorResponse,
  namingWorkspaceJson,
  parseNamingWorkspaceJson,
  rejectCrossOrigin,
} from "@/lib/naming-workspace-http"

const shortlistIdSchema = z.string().uuid()
const jsonObjectSchema = z.object({}).catchall(z.unknown())
const candidateNameSchema = z.string().trim().min(1).max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i, "Use a valid domain-style candidate name.")

const createEntrySchema = z.object({
  candidateName: candidateNameSchema,
  availabilitySnapshot: jsonObjectSchema.optional(),
  founderSignalSnapshot: jsonObjectSchema.nullable().optional(),
  tier: z.enum(["top", "consider", "reject"]).nullable().optional(),
  notes: z.string().trim().min(1).max(4000).nullable().optional(),
  position: z.number().int().min(0).max(10000).optional(),
}).strict()

type EntryCollectionRouteContext = {
  params: Promise<{ shortlistId: string }>
}

function parseShortlistId(shortlistId: string): string {
  const parsed = shortlistIdSchema.safeParse(shortlistId)
  if (!parsed.success) throw new Error("invalid_shortlist")
  return parsed.data
}

export async function POST(request: NextRequest, context: EntryCollectionRouteContext) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError

  try {
    const shortlistId = parseShortlistId((await context.params).shortlistId)
    const input = await parseNamingWorkspaceJson(request, createEntrySchema)
    return namingWorkspaceJson(await createNamingShortlistEntry({
      ...input,
      shortlistId,
      availabilitySnapshot: input.availabilitySnapshot as NamingWorkspaceJsonObject | undefined,
      founderSignalSnapshot: input.founderSignalSnapshot as NamingWorkspaceJsonObject | null | undefined,
    }), 201)
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_shortlist") {
      return namingWorkspaceJson({ error: "invalid_shortlist", message: "The shortlist reference is invalid." }, 400)
    }
    return namingWorkspaceErrorResponse(error, {
      code: "entry_creation_failed",
      message: "The shortlist entry could not be created.",
    })
  }
}
