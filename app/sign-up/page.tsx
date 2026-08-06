"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthCard, AuthShowcase, AuthTitle } from "@/components/auth-showcase"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import { sanitizeRedirectPath } from "@/lib/safe-redirect"

const inputClass =
  "h-12 w-full rounded-lg border border-[#D4AF37]/24 bg-white/[0.045] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#D4AF37]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#D4AF37]/12 sm:h-14 sm:pl-12 sm:text-base"

function SignUpForm() {
  const searchParams = useSearchParams()
  const redirect = sanitizeRedirectPath(searchParams.get("redirect"), "/dashboard")
  const signInHref = `/sign-in?redirect=${encodeURIComponent(redirect)}`

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        // See the sign-in flow: use a document navigation so the newly-issued
        // session cookies are on the first protected request.
        window.location.assign(redirect)
        return
      }

      setSuccess(true)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShowcase variant="sign-up">
        <AuthCard>
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
              <Mail className="h-6 w-6 text-[#F4D779]" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-white/50">
              We sent a confirmation link to <span className="font-medium text-white">{email}</span>.
            </p>
            <Link
              href={signInHref}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] px-5 text-sm font-semibold text-white transition hover:border-[#D4AF37]/30 hover:text-[#F4D779]"
            >
              Back to sign in
            </Link>
          </div>
        </AuthCard>
      </AuthShowcase>
    )
  }

  return (
    <AuthShowcase variant="sign-up">
      <AuthCard>
        <AuthTitle
          title="Create your NamoLux account"
          subtitle="Check, score, and compare the candidate names your team is considering."
          icon="sparkles"
        />

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3">
            <p className="text-center text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-white/58">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/58">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/58">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-12`}
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-white/35">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-white/58">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37] sm:h-5 sm:w-5" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-[#F4D779] to-[#C89B33] text-sm font-semibold text-black shadow-lg shadow-[#D4AF37]/20 transition hover:from-[#FFE08A] hover:to-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-55 sm:h-14 sm:text-base"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account..." : "Create account"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          Already have an account?{" "}
          <Link href={signInHref} className="font-medium text-[#F4D779] transition hover:text-[#D4AF37]">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShowcase>
  )
}

function SignUpLoading() {
  return (
    <AuthShowcase variant="sign-up">
      <AuthCard>
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      </AuthCard>
    </AuthShowcase>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpForm />
    </Suspense>
  )
}
