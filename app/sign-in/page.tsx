"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthCard, AuthShowcase, AuthTitle } from "@/components/auth-showcase"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { sanitizeRedirectPath } from "@/lib/safe-redirect"

const inputClass =
  "h-12 w-full rounded-lg border border-[#D4AF37]/24 bg-white/[0.045] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#D4AF37]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#D4AF37]/12 sm:h-14 sm:pl-12 sm:text-base"

function SignInForm() {
  const searchParams = useSearchParams()
  const redirect = sanitizeRedirectPath(searchParams.get("redirect"), "/dashboard")
  const isCheckoutReturn = redirect === PRODUCT_OFFER.checkoutHref
    || redirect.startsWith(`${PRODUCT_OFFER.checkoutHref}?`)
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(redirect)}`

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      // Supabase writes the browser session cookie before this resolves. A full
      // navigation avoids Next prefetching an authenticated page with a stale,
      // anonymous request during that hand-off.
      window.location.assign(redirect)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShowcase variant="sign-in">
      <AuthCard>
        <AuthTitle
          title={isCheckoutReturn ? "Sign in to activate NamoLux Pro" : "Welcome back"}
          subtitle={isCheckoutReturn ? `${PRODUCT_OFFER.paidPriceLabel} · ${PRODUCT_OFFER.cancellationLabel}` : "Sign in to access your shortlist tools and saved work."}
        />

        {isCheckoutReturn && (
          <div className="mb-6 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/8 px-4 py-3 text-sm text-white/62">
            <p>After sign-in, you will continue to secure Stripe checkout.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/pricing" className="font-medium text-[#F4D779] transition hover:text-[#D4AF37]">
                Return to pricing
              </Link>
              <Link href="/contact" className="font-medium text-[#F4D779] transition hover:text-[#D4AF37]">
                Contact support
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3">
            <p className="text-center text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/58">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-medium text-white/58">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-[#F4D779] transition hover:text-[#D4AF37]">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-12`}
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4D779]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-[#F4D779] to-[#C89B33] text-sm font-semibold text-black shadow-lg shadow-[#D4AF37]/20 transition hover:from-[#FFE08A] hover:to-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-55 sm:h-14 sm:text-base"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          New to NamoLux?{" "}
          <Link href={signUpHref} className="font-medium text-[#F4D779] transition hover:text-[#D4AF37]">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthShowcase>
  )
}

function SignInLoading() {
  return (
    <AuthShowcase variant="sign-in">
      <AuthCard>
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      </AuthCard>
    </AuthShowcase>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  )
}
