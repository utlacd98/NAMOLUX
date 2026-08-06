import { handleCallback } from "@vercel/queue"

import { BulkCheckQueueDeferredError, processBulkCheckJob } from "@/lib/bulk-checks"

export const runtime = "nodejs"
export const maxDuration = 60

type BulkAvailabilityMessage = { jobId?: unknown }

export const POST = handleCallback<BulkAvailabilityMessage>(async (message) => {
  if (!message || typeof message.jobId !== "string") {
    throw new Error("Invalid bulk availability queue message")
  }
  const outcome = await processBulkCheckJob(message.jobId)
  if (outcome === "deferred") {
    throw new BulkCheckQueueDeferredError("Bulk availability capacity is temporarily full")
  }
}, {
  visibilityTimeoutSeconds: 60,
  retry: (error) => {
    if (error instanceof BulkCheckQueueDeferredError) return { afterSeconds: 5 }
    return { afterSeconds: 15 }
  },
})
