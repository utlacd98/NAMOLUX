import { handleCallback } from "@vercel/queue"
import { processDailyLaunchMessage, type DailyLaunchMessage } from "@/lib/daily-launch-signal"

export const maxDuration = 300

export const POST = handleCallback<DailyLaunchMessage>(async (message) => {
  const outcome = await processDailyLaunchMessage(message)
  if (outcome === "deferred") throw new Error("Daily Launch Signal global concurrency limit reached")
}, {
  visibilityTimeoutSeconds: 300,
  retry: () => ({ afterSeconds: 20 }),
})
