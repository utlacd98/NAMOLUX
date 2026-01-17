"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Sun, Moon, Zap, Coins } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import { useCredits } from "@/hooks/use-credits"

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/seo-audit", label: "SEO Audit" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
]

export function Navbar() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { isSignedIn } = useUser()
  const { credits, isLoading } = useCredits()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "glass border-b border-border" : "bg-transparent",
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - wrapped in Link */}
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
            aria-label="NamoLux Home"
          >
            <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight">NamoLux</span>
          </Link>

          {/* Desktop Nav - Updated to use Link for internal routes */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Credits Display */}
            {isSignedIn && (
              <Link
                href="/pricing"
                className="hidden items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/80 sm:flex"
              >
                <Coins className="h-4 w-4 text-primary" />
                <span>{isLoading ? "..." : credits}</span>
              </Link>
            )}

            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              suppressHydrationWarning
            >
              {!mounted ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : theme === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {isSignedIn ? (
              <>
                <Button
                  asChild
                  className="hidden animate-breathing-glow bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
                >
                  <Link href="/generate">Generate Names</Link>
                </Button>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9",
                    },
                  }}
                />
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild className="hidden animate-breathing-glow bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex">
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav - Updated for Link support */}
        {isOpen && (
          <div className="glass mt-2 rounded-lg border border-border p-4 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ),
              )}
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/generate">Generate Names</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
