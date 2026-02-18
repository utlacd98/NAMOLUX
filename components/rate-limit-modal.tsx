"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { X, Crown, Sparkles, Zap, Clock } from "lucide-react"

interface RateLimitModalProps {
  isOpen: boolean
  onClose: () => void
  resetAt: string | null
  hoursRemaining: number
  minutesRemaining: number
}

export function RateLimitModal({
  isOpen,
  onClose,
  resetAt,
  hoursRemaining: initialHours,
  minutesRemaining: initialMinutes,
}: RateLimitModalProps) {
  const router = useRouter()
  const [hours, setHours] = useState(initialHours)
  const [minutes, setMinutes] = useState(initialMinutes)

  // Update countdown every minute
  useEffect(() => {
    if (!resetAt) return

    const updateCountdown = () => {
      const now = new Date()
      const reset = new Date(resetAt)
      const diffMs = reset.getTime() - now.getTime()
      
      if (diffMs <= 0) {
        setHours(0)
        setMinutes(0)
        return
      }
      
      setHours(Math.floor(diffMs / (1000 * 60 * 60)))
      setMinutes(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [resetAt])

  if (!isOpen) return null

  const handleMaybeLater = () => {
    onClose()
    router.push("/")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#141414] border border-[#D4A843]/30 rounded-2xl p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleMaybeLater}
          className="absolute top-4 right-4 text-[#555] hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 flex items-center justify-center border border-[#D4A843]/30">
            <Crown className="h-10 w-10 text-[#D4A843]" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          You've used your free generation
        </h2>

        {/* Subtext */}
        <p className="text-[#888] text-center mb-6">
          Upgrade to NamoLux Pro for unlimited domain generation, Founder Signal™ scoring, and more.
        </p>

        {/* Price */}
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-[#D4A843]">£9.99</span>
          <span className="text-[#888]">/month</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Sparkles, text: "Unlimited generations" },
            { icon: Zap, text: "Founder Signal™" },
            { icon: Crown, text: "Priority support" },
            { icon: Clock, text: "Cancel anytime" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-[#aaa]">
              <Icon className="h-4 w-4 text-[#D4A843]" />
              {text}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="w-full py-3 px-6 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold rounded-lg text-center transition flex items-center justify-center gap-2"
          >
            Upgrade to Pro
            <span className="text-lg">→</span>
          </Link>
          <button
            onClick={handleMaybeLater}
            className="w-full py-3 px-6 bg-transparent hover:bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white font-medium rounded-lg transition"
          >
            Maybe later
          </button>
        </div>

        {/* Countdown */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#555]">
            <Clock className="inline-block h-3.5 w-3.5 mr-1" />
            Your free generation resets in{" "}
            <span className="text-[#888]">
              {hours > 0 && `${hours}h `}{minutes}m
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// Export a hook for easier integration
export function useRateLimitState() {
  const [isOpen, setIsOpen] = useState(false)
  const [resetAt, setResetAt] = useState<string | null>(null)
  const [hoursRemaining, setHoursRemaining] = useState(0)
  const [minutesRemaining, setMinutesRemaining] = useState(0)

  const showRateLimitModal = (data: {
    resetAt: string | null
    hoursRemaining: number
    minutesRemaining: number
  }) => {
    setResetAt(data.resetAt)
    setHoursRemaining(data.hoursRemaining)
    setMinutesRemaining(data.minutesRemaining)
    setIsOpen(true)
  }

  return {
    isOpen,
    setIsOpen,
    resetAt,
    hoursRemaining,
    minutesRemaining,
    showRateLimitModal,
  }
}

