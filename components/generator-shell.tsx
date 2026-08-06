import Link from "next/link"
import { ArrowRight, Globe2, ListFilter, MessageSquare, ShieldCheck } from "lucide-react"
import { PRODUCT_OFFER } from "@/lib/product-offer"

export function GeneratorShell({ initialBrief = "" }: { initialBrief?: string }) {
  return (
    <main id="main-content" className="min-h-[calc(100vh-78px)] bg-[#0b0b0a] px-4 py-14 text-[#f5f1ea]">
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="generator-shell-heading">
          <h1 id="generator-shell-heading" className="max-w-4xl font-display text-5xl font-medium leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            Choose the name worth building on.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#bcb5aa]">
            Generate candidates, check domains, and compare the strongest options with Founder Signal.
          </p>
          <form action="/generate" method="get" className="mt-9 max-w-3xl">
            <label htmlFor="generator-shell-brief" className="mb-3 block text-sm font-semibold">What are you building?</label>
            <textarea
              id="generator-shell-brief"
              name="q"
              defaultValue={initialBrief}
              rows={5}
              minLength={2}
              maxLength={1000}
              required
              placeholder="A bookkeeping platform for independent consultants…"
              className="w-full resize-y rounded-lg border border-[#e2cba0]/30 bg-white/[0.035] p-4 text-base leading-7 text-[#f5f1ea] outline-none placeholder:text-white/30 focus:border-[#e1c27f] focus:ring-4 focus:ring-[#c4a15b]/15"
            />
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#c4a15b] px-6 font-semibold text-[#16130f] transition hover:bg-[#e1c27f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e1c27f]">
                Generate candidates <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="/bulk-domain-check" className="inline-flex min-h-11 items-center text-sm text-[#e1c27f] underline decoration-[#c4a15b]/60 underline-offset-4">
                Paste a shortlist instead
              </Link>
            </div>
            <p className="mt-4 text-sm text-[#8f887e]">{PRODUCT_OFFER.freeUsageLabel}. No account required.</p>
          </form>

          <div className="mt-12 grid border-y border-[#e2cba0]/20 sm:grid-cols-3">
            <div className="flex min-h-24 items-center gap-3 border-b border-[#e2cba0]/20 px-4 sm:border-b-0 sm:border-r"><ListFilter className="h-5 w-5 text-[#e1c27f]" /><span>Brandable candidates</span></div>
            <div className="flex min-h-24 items-center gap-3 border-b border-[#e2cba0]/20 px-4 sm:border-b-0 sm:border-r"><Globe2 className="h-5 w-5 text-[#e1c27f]" /><span>Six-extension domain checks</span></div>
            <div className="flex min-h-24 items-center gap-3 px-4"><MessageSquare className="h-5 w-5 text-[#e1c27f]" /><span>Founder Signal reasoning on Pro</span></div>
          </div>
        </section>

        <aside className="border-l border-[#e2cba0]/20 pl-6" aria-label="Generator status">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8f887e]">Preparing the naming workspace</p>
          <div role="status" aria-live="polite" className="mt-5 border border-[#e2cba0]/25 p-5 text-sm text-[#bcb5aa]">
            The interactive controls, loading states, and result workspace will appear here when the app is ready.
          </div>
          <div className="mt-8 border-t border-[#e2cba0]/20 pt-6">
            <p className="flex gap-3 text-sm leading-6 text-[#8f887e]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#e1c27f]" />Your brief is used to generate this result. Do not include confidential information.</p>
            <p className="mt-4 text-xs leading-5 text-[#6f6961]">Availability can be available, unavailable, unknown, or verification required. Confirm any result with your registrar.</p>
          </div>
          <noscript>
            <p className="mt-8 border border-amber-400/35 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              JavaScript is required to run live generation and availability checks. The brief form remains available so you can keep the request in the page URL and continue when scripts are enabled.
            </p>
          </noscript>
        </aside>
      </div>
    </main>
  )
}
