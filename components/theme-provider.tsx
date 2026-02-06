"use client"

import type * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark"

interface ThemeContextValue {
  theme: Theme
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  mounted: false,
})

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Force dark mode always - clear any stored light theme
    localStorage.removeItem("theme")
    const root = document.documentElement
    root.classList.remove("light")
    root.classList.add("dark")
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: "dark", mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  return context
}
