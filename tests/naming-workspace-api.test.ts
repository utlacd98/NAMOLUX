import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  createProject: vi.fn(),
}))

vi.mock("@/lib/naming-workspace", () => {
  class NamingWorkspaceError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly status = 400,
    ) {
      super(message)
      this.name = "NamingWorkspaceError"
    }
  }

  return {
    getNamingWorkspaceDashboard: mocks.getDashboard,
    createNamingProject: mocks.createProject,
    NamingWorkspaceError,
  }
})

import { GET as getWorkspace } from "@/app/api/naming-workspace/route"
import { POST as createProject } from "@/app/api/naming-workspace/projects/route"
import { NamingWorkspaceError } from "@/lib/naming-workspace"

function jsonRequest(body: unknown, origin = "https://namolux.test") {
  return new NextRequest("https://namolux.test/api/naming-workspace/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  mocks.getDashboard.mockReset()
  mocks.createProject.mockReset()
})

describe("naming workspace dashboard route", () => {
  it("maps expected authentication errors without exposing internals", async () => {
    mocks.getDashboard.mockRejectedValue(new NamingWorkspaceError(
      "authentication_required",
      "Sign in to access saved naming work.",
      401,
    ))

    const response = await getWorkspace()

    expect(response.status).toBe(401)
    expect(response.headers.get("cache-control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({
      error: "authentication_required",
      message: "Sign in to access saved naming work.",
    })
  })
})

describe("naming workspace project route", () => {
  it("rejects unexpected request fields before the service is called", async () => {
    const response = await createProject(jsonRequest({
      name: "Launch decision",
      untrustedOwnerId: "another-account",
    }))

    expect(response.status).toBe(400)
    expect(mocks.createProject).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_request" })
  })

  it("rejects cross-origin mutations", async () => {
    const response = await createProject(jsonRequest(
      { name: "Launch decision" },
      "https://attacker.example",
    ))

    expect(response.status).toBe(403)
    expect(mocks.createProject).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_origin" })
  })

  it("creates a validated project and does not cache the result", async () => {
    mocks.createProject.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Launch decision",
    })

    const response = await createProject(jsonRequest({ name: "Launch decision" }))

    expect(response.status).toBe(201)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(mocks.createProject).toHaveBeenCalledWith({ name: "Launch decision" })
    await expect(response.json()).resolves.toMatchObject({ name: "Launch decision" })
  })
})
