import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { z } from "zod"
import { NamingWorkspaceError } from "@/lib/naming-workspace"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
}

export function namingWorkspaceJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

export function namingWorkspaceNoContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS })
}

export function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin")
  if (!origin || origin === new URL(request.url).origin) return null
  return namingWorkspaceJson(
    { error: "invalid_origin", message: "This request must come from NamoLux." },
    403,
  )
}

export async function parseNamingWorkspaceJson<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new NamingWorkspaceError("invalid_request", "A valid JSON request is required.")
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new NamingWorkspaceError(
      "invalid_request",
      parsed.error.issues[0]?.message || "Check the request details.",
    )
  }
  return parsed.data
}

export function namingWorkspaceErrorResponse(
  error: unknown,
  fallback: { code: string; message: string; status?: number },
): NextResponse {
  if (error instanceof NamingWorkspaceError) {
    return namingWorkspaceJson({ error: error.code, message: error.message }, error.status)
  }

  console.error("[naming-workspace]", fallback.code, error)
  return namingWorkspaceJson(
    { error: fallback.code, message: fallback.message },
    fallback.status || 500,
  )
}
