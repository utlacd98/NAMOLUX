import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  handleCallback: vi.fn(),
  processJob: vi.fn(),
}))

vi.mock("@vercel/queue", () => ({
  handleCallback: (handler: unknown, options: unknown) => {
    mocks.handleCallback(handler, options)
    return handler
  },
}))

vi.mock("@/lib/bulk-checks", () => ({
  BulkCheckQueueDeferredError: class BulkCheckQueueDeferredError extends Error {},
  processBulkCheckJob: mocks.processJob,
}))

import { POST } from "@/app/api/queues/bulk-availability/route"
import { BulkCheckQueueDeferredError } from "@/lib/bulk-checks"

type QueueOptions = {
  visibilityTimeoutSeconds: number
  retry: (error: Error) => { afterSeconds: number }
}

beforeEach(() => {
  // The route registers its callback during module import. Keep that recorded
  // configuration available to both tests while resetting per-message work.
  mocks.processJob.mockReset()
})

describe("bulk availability queue callback", () => {
  it("processes a valid durable job and configures short retry for global-capacity deferrals", async () => {
    mocks.processJob.mockResolvedValue("processed")

    await expect(POST({ jobId: "11111111-1111-4111-8111-111111111111" } as never)).resolves.toBeUndefined()
    expect(mocks.processJob).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")

    const options = mocks.handleCallback.mock.calls[0]?.[1] as QueueOptions
    expect(options.visibilityTimeoutSeconds).toBe(60)
    expect(options.retry(new BulkCheckQueueDeferredError("capacity full"))).toEqual({ afterSeconds: 5 })
    expect(options.retry(new Error("upstream failure"))).toEqual({ afterSeconds: 15 })
  })

  it("retries deferred work and rejects malformed messages without starting a provider job", async () => {
    mocks.processJob.mockResolvedValue("deferred")
    await expect(POST({ jobId: "11111111-1111-4111-8111-111111111111" } as never)).rejects.toBeInstanceOf(BulkCheckQueueDeferredError)

    mocks.processJob.mockClear()
    await expect(POST({} as never)).rejects.toThrow("Invalid bulk availability queue message")
    expect(mocks.processJob).not.toHaveBeenCalled()
  })
})
