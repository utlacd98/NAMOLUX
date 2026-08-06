import { getNamingWorkspaceDashboard } from "@/lib/naming-workspace"
import { namingWorkspaceErrorResponse, namingWorkspaceJson } from "@/lib/naming-workspace-http"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return namingWorkspaceJson(await getNamingWorkspaceDashboard())
  } catch (error) {
    return namingWorkspaceErrorResponse(error, {
      code: "workspace_unavailable",
      message: "Saved naming work is temporarily unavailable.",
      status: 503,
    })
  }
}
