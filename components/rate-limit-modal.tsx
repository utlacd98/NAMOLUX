"use client"

import { useEffect, useState } from "react"
import { X, Clock, Search, Shield } from "lucide-react"

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
  const [hours, setHours] = useState(initialHours)
  const [minutes, setMinutes] = useState(initialMinutes)

  useEffect(() => {
    if (!resetAt) return

    const updateCountdown = () => {
      const diffMs = new Date(resetAt).getTime() - Date.now()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#D4A843]/25 bg-[#141414] p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-[#555] transition hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10">
            <Search className="h-10 w-10 text-[#D4A843]" />
          </div>
        </div>

        <h2 className="mb-2 text-center text-2xl font-bold text-white">Monthly tool limit reached</h2>
        <p className="mb-6 text-center text-[#888]">
          This specialist-tool allowance has been used. Quick Generate remains free without a monthly quota.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {[
            { icon: Search, text: "Quick Generate stays free" },
            { icon: Shield, text: "Pro unlocks fair-use tools" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-[#aaa]">
              <Icon className="h-4 w-4 text-[#D4A843]" />
              {text}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-[#D4A843] px-6 py-3 font-semibold text-black transition hover:bg-[#c49a3d]"
        >
          Close
        </button>

        {resetAt && (
          <p className="mt-6 text-center text-sm text-[#555]">
            <Clock className="mr-1 inline-block h-3.5 w-3.5" />
            Estimated reset in <span className="text-[#888]">{hours > 0 && `${hours}h `}{minutes}m</span>
          </p>
        )}
      </div>
    </div>
  )
}

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
