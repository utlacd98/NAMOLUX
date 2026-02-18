"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Mail, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image src="/logo.svg" alt="NamoLux" width={140} height={36} className="h-9 w-auto" priority />
            </Link>
          </div>
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-[#D4A843]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-[#D4A843]" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Check your email</h1>
            <p className="text-[#888] mb-6">
              We've sent a password reset link to <span className="text-white">{email}</span>
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 text-[#D4A843] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo.svg" alt="NamoLux" width={140} height={36} className="h-9 w-auto" priority />
          </Link>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-8">
          <h1 className="text-2xl font-semibold text-white text-center mb-2">Reset your password</h1>
          <p className="text-[#888] text-center mb-6">
            Enter your email and we'll send you a reset link
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-[#888] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-black font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-[#888] mt-6">
            <Link href="/sign-in" className="inline-flex items-center gap-2 text-[#D4A843] hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

