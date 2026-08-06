import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildNamingDecisionReportSnapshot,
  hashNamingWorkspaceShareToken,
  NamingWorkspaceError,
  type NamingProject,
  type NamingShortlist,
  type NamingShortlistEntry,
} from "@/lib/naming-workspace"

const project: NamingProject = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Acme launch",
  selectedBrandName: null,
  businessDescription: "A focused launch project.",
  category: "Software",
  locale: "en-GB",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
}

const shortlist: NamingShortlist = {
  id: "22222222-2222-4222-8222-222222222222",
  projectId: project.id,
  title: "Finalists",
  primaryTld: "com",
  createdAt: "2026-08-01T10:01:00.000Z",
  updatedAt: "2026-08-01T10:01:00.000Z",
}

const entry: NamingShortlistEntry = {
  id: "33333333-3333-4333-8333-333333333333",
  shortlistId: shortlist.id,
  candidateName: "acme",
  primaryDomain: "acme.com",
  availabilitySnapshot: { com: { status: "available" } },
  founderSignalSnapshot: { score: 89, version: "v1" },
  tier: "top",
  notes: "Strongest option.",
  position: 0,
  isWinner: true,
  createdAt: "2026-08-01T10:02:00.000Z",
  updatedAt: "2026-08-01T10:02:00.000Z",
}

describe("naming workspace report snapshots", () => {
  it("captures a deep immutable decision snapshot", () => {
    const snapshot = buildNamingDecisionReportSnapshot({
      project,
      shortlist,
      entries: [entry],
      generatedAt: "2026-08-01T10:05:00.000Z",
    })

    entry.availabilitySnapshot.com = { status: "taken" }
    entry.notes = "Changed after reporting."

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      generatedAt: "2026-08-01T10:05:00.000Z",
      project: { name: "Acme launch" },
      shortlist: { primaryTld: "com" },
      entries: [{
        candidateName: "acme",
        primaryDomain: "acme.com",
        availabilitySnapshot: { com: { status: "available" } },
        notes: "Strongest option.",
        isWinner: true,
      }],
    })
  })
})

describe("naming workspace share tokens", () => {
  it("returns a stable SHA-256 hash without retaining the raw token", () => {
    const token = "a".repeat(43)
    const hash = hashNamingWorkspaceShareToken(token)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toBe(hashNamingWorkspaceShareToken(token))
    expect(hash).not.toBe(hashNamingWorkspaceShareToken("b".repeat(43)))
  })

  it("rejects malformed public-share capabilities", () => {
    expect(() => hashNamingWorkspaceShareToken("short")).toThrow(NamingWorkspaceError)
    try {
      hashNamingWorkspaceShareToken("short")
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid_share_token", status: 404 })
    }
  })
})
