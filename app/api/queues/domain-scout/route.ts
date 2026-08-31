import { handleCallback } from "@vercel/queue"
import { processDomainScoutMessage, type DomainScoutMessage } from "@/lib/autonomous-domain-scout"

export const maxDuration = 300
export const POST = handleCallback<DomainScoutMessage>(async (message) => {
  const outcome = await processDomainScoutMessage(message)
  if (outcome === "deferred") throw new Error("Scout global concurrency limit reached")
}, {
  visibilityTimeoutSeconds: 300,
  retry: () => ({ afterSeconds: 30 }),
})
