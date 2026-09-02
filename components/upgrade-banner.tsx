"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

export function UpgradeBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check if banner was dismissed this session
    const dismissed = sessionStorage.getItem("namolux_banner_dismissed")
    if (!dismissed) {
      // Small delay for smooth entrance
      setTimeout(() => {
        setIsVisible(true)
        setIsAnimating(true)
      }, 100)
    }
  }, [])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      sessionStorage.setItem("namolux_banner_dismissed", "true")
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={`w-full transition-all duration-300 ease-out ${
        isAnimating ? "max-h-11 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
      }`}
    >
      <div
        className="relative h-11 flex items-center justify-center px-4"
        style={{
          background: "linear-gradient(90deg, #1a1708 0%, #1a1a1a 50%, #111111 100%)",
          borderBottom: "1px solid rgba(212, 168, 67, 0.15)",
        }}
      >
        {/* Left accent - pulsing dot */}
        <div className="absolute left-4 flex items-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500/60 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </div>

        {/* Banner text */}
        <div className="mx-10 min-w-0 truncate text-center text-[12px] text-[#a0a0a0] sm:text-[13px]">
          <span className="truncate">
            Quick is <span className="text-amber-500 font-medium">free without a monthly quota</span>. Pro adds unlimited fair-use tools for{" "}
            <span className="text-amber-500 font-medium">{"\u00a3"}12.99/month or {"\u00a3"}99/year</span>.
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 p-1 text-[#555] hover:text-white transition-colors duration-200"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Subtle shimmer effect */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(212, 168, 67, 0.03) 50%, transparent 100%)",
            animation: "shimmer 3s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
