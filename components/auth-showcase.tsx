"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Crown, Diamond, ShieldCheck, Sparkles, Wand2, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type AuthShowcaseVariant = "sign-in" | "sign-up"

interface AuthShowcaseProps {
  variant: AuthShowcaseVariant
  children: ReactNode
}

const variantCopy = {
  "sign-in": {
    helper: "Secure sign-in protected with encrypted authentication",
  },
  "sign-up": {
    helper: "By continuing, you agree to our Terms of Service and Privacy Policy.",
  },
}

export function AuthShowcase({ variant, children }: AuthShowcaseProps) {
  const copy = variantCopy[variant]

  return (
    <main className="namolux-auth-page relative min-h-screen overflow-hidden bg-[#060606] text-white">
      <div className="auth-gold-glow pointer-events-none absolute left-1/2 top-[49%] h-[min(76vh,680px)] w-[min(88vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-3 sm:px-6 sm:py-6 lg:py-8">
        <Link href="/" className="hidden min-h-0 w-fit items-center justify-center sm:flex" aria-label="NamoLux home">
          <Image
            src="/namoluxloginpagelogo.svg"
            alt="NamoLux"
            width={230}
            height={62}
            className="h-28 w-auto sm:h-32"
            priority
          />
        </Link>

        <section className="flex w-full flex-none items-start justify-center py-2 sm:py-5 lg:py-6">
          <div className="auth-card-halo relative w-full max-w-[min(100%,560px)]">
            {children}
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 text-center text-xs text-white/40">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/85" />
          <span>{copy.helper}</span>
        </div>
      </div>
    </main>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-card-shine relative overflow-hidden rounded-[1.35rem] border border-[#D4AF37]/35 bg-[#090909]/90 p-4 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-8 lg:p-10">
      {children}
    </div>
  )
}

export function AuthTitle({
  title,
  subtitle,
  icon = "wand",
}: {
  title: string
  subtitle: string
  icon?: "wand" | "sparkles"
}) {
  const Icon = icon === "sparkles" ? Sparkles : Wand2
  const isSignIn = title.toLowerCase().includes("welcome")
  const parts = title.split(" ")
  const signInHighlight = isSignIn ? parts.pop() : ""
  const namoluxTitleParts = title.includes("NamoLux") ? title.split("NamoLux") : null
  const pills: Array<[LucideIcon, string]> = isSignIn
    ? [
        [Crown, "Founder-first platform"],
        [Diamond, "Luxury naming tools"],
        [Zap, "Fast domain discovery"],
      ]
    : [
        [Diamond, "Luxury-first branding"],
        [Zap, "Instant domain ideas"],
        [Crown, "Founder-focused tools"],
      ]

  return (
    <div className="mb-5 text-center sm:mb-7">
      <div className="sr-only">
        <Icon className="h-5 w-5" />
      </div>
      <h1 className="font-display text-2xl font-semibold leading-tight text-white sm:text-5xl">
        {namoluxTitleParts ? (
          <>
            {namoluxTitleParts[0]}
            <span className="bg-gradient-to-b from-[#F6D77D] to-[#A77D25] bg-clip-text text-transparent">
              NamoLux
            </span>
            {namoluxTitleParts[1]}
          </>
        ) : signInHighlight ? (
          <>
            {parts.join(" ")}
            {" "}
            <span className="bg-gradient-to-b from-[#F6D77D] to-[#A77D25] bg-clip-text text-transparent">
              {signInHighlight}
            </span>
          </>
        ) : (
          title
        )}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-white/55 sm:mt-3 sm:text-base sm:leading-6">{subtitle}</p>
      <div className="mt-6 hidden gap-2 sm:grid sm:grid-cols-3">
        {pills.map(([PillIcon, label]) => (
          <div
            key={label}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-xs text-white/78 shadow-inner shadow-white/[0.03]"
          >
            <PillIcon className="h-4 w-4 shrink-0 text-[#D4AF37]" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
