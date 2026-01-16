"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

export function useCredits() {
  const { isSignedIn, user } = useUser()
  const [credits, setCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCredits() {
      if (!isSignedIn || !user) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          setCredits(data.credits)
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCredits()
  }, [isSignedIn, user])

  const refreshCredits = async () => {
    if (!isSignedIn || !user) return

    try {
      const response = await fetch("/api/credits/balance")
      if (response.ok) {
        const data = await response.json()
        setCredits(data.credits)
      }
    } catch (error) {
      console.error("Failed to refresh credits:", error)
    }
  }

  return { credits, isLoading, refreshCredits, setCredits }
}

