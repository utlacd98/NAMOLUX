import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("Bulk Decision Workspace source contract", () => {
  it("uses server decision APIs and never calculates Founder Signal in the browser", () => {
    const workspace = source("../components/bulk-decision-workspace.tsx")

    expect(workspace).toContain('fetch("/api/bulk-checks"')
    expect(workspace).toContain("fetch(`/api/bulk-checks?${params.toString()}`")
    expect(workspace).toContain('fetch("/api/founder-signal/shortlist"')
    expect(workspace).toContain('fetch("/api/workspace/usage"')
    expect(workspace).toContain('workspaceJson<NamingWorkspaceDashboard>("/api/naming-workspace")')
    expect(workspace).not.toMatch(/\/api\/(quick-generate|generate-domains|analyze-description|name-tools)/)
    expect(workspace).not.toContain("scoreName(")
    expect(workspace).not.toContain("createBrowserClient")
  })

  it("keeps an anonymous local draft while routing Pro saves, reports, and links through server APIs", () => {
    const workspace = source("../components/bulk-decision-workspace.tsx")

    expect(workspace).toContain('const DRAFT_KEY = "namolux:bulk-decision-draft:v1"')
    expect(workspace).toContain("window.localStorage.setItem(DRAFT_KEY")
    expect(workspace).toContain('workspaceJson<SavedProject>("/api/naming-workspace/projects"')
    expect(workspace).toContain('workspaceJson<SavedShortlist>("/api/naming-workspace/shortlists"')
    expect(workspace).toContain('workspaceJson<SavedReport>("/api/naming-workspace/reports"')
    expect(workspace).toContain("/api/naming-workspace/reports/${activeReport.id}/shares")
    expect(workspace).toContain("/api/naming-workspace/shares/${shareId}")
    expect(workspace).toContain("/api/naming-workspace/shortlists/${activeSavedShortlist.id}")
    expect(workspace).toContain("/api/naming-workspace/reports/${activeReport.id}")
    expect(workspace).toContain("/shared-report/${share.token}")
    expect(workspace).toContain("Save workspace")
    expect(workspace).not.toContain("coming next")
  })

  it("uses one fresh idempotency key per user-started run and only retains it for retry", () => {
    const workspace = source("../components/bulk-decision-workspace.tsx")

    expect(workspace).toContain("function createBulkRunKey()")
    expect(workspace).toContain("crypto.randomUUID")
    expect(workspace).toContain("bulkRetry?.fingerprint === fingerprint ? bulkRetry.idempotencyKey : createBulkRunKey()")
    expect(workspace).toContain("disabled={isChecking || activeJob")
    expect(workspace).toContain("setBulkRetry(null)")
    expect(workspace).not.toContain("stableIdempotencyKey")
  })

  it("uses the dedicated workspace instead of the generator-heavy component", () => {
    const page = source("../app/bulk-domain-check/workspace/page.tsx")

    expect(page).toContain("BulkDecisionWorkspace")
    expect(page).not.toContain("GenerateNames")
    expect(page).not.toContain("generatorToolsEnabled")
    expect(page).toContain("isDecisionWorkspaceEnabled")
    expect(page).toContain('redirect("/bulk-domain-check?workspace=paused")')
  })

  it("renders phone-sized availability results as readable candidate cards and places scoring before comparison", () => {
    const workspace = source("../components/bulk-decision-workspace.tsx")

    expect(workspace).toContain("function MobileCandidateCard")
    expect(workspace).toContain('aria-label="Availability results by candidate"')
    expect(workspace).toContain('className="mt-6 hidden overflow-x-auto border border-[#c4a15b]/35 lg:block"')
    expect(workspace).toContain('aria-label="Founder Signal action"')
    expect(workspace.indexOf('aria-label="Founder Signal action"')).toBeLessThan(workspace.indexOf('id="compare-heading"'))
  })
})
