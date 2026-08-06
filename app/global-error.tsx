"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-semibold">NamoLux needs to reload</h1>
            <p className="mt-3 text-sm text-white/60">A critical interface error occurred. No billing action was completed by this screen.</p>
            <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-lg bg-[#D4A843] px-5 font-semibold text-black">Reload</button>
          </div>
        </main>
      </body>
    </html>
  )
}
