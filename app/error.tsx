"use client"

import { useEffect } from "react"

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("NamoLux route error:", error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-semibold">This page could not finish loading.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Your account and billing state have not been changed. Try the request again.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">
          Try again
        </button>
      </div>
    </main>
  )
}
