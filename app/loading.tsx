export default function RootLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading NamoLux…</p>
      </div>
    </main>
  )
}
